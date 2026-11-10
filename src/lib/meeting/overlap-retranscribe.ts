/**
 * A second transcription pass over overlapping speech.
 *
 * One source's audio is one speech stream to the speech model, and inside an
 * overlap it mostly writes down the louder voice: the quieter speaker's words
 * never reach the transcript, whoever the diarizer says is talking. Where the
 * diarizer has two or more speakers on one source for `MIN_RETRANSCRIBE_SECONDS`
 * or more, the overlap (padded by `RETRANSCRIBE_PAD_SECONDS`) is transcribed
 * again on its own, and the words that pass hears which the first did not are
 * added, under the speaker the first pass did not write down.
 *
 * The speech model is injected (`TranscribeClip`), so this module holds no
 * engine of its own. Live, it holds the last `HOLD_SECONDS` of each source's
 * audio, is told each source's turns by `diarization-bridge.ts`, and writes
 * the words it adds to the store as segments of their own, marked with the
 * overlap so the transcript shows them beside the louder speaker's.
 *
 * On the AMI replay (`scripts/live-diarization-replay.test.ts`, Parakeet's
 * words, 19 overlaps in 5 min) this took WER from 0.583 to 0.573 and the
 * share of the 346 reference words spoken in overlap that reach the
 * transcript from 26.9 % to 28.6 %; 63 % of the 19 words it added are under
 * the right speaker.
 */

import { int16ToFloat32, CAPTURE_SAMPLE_RATE } from './pcm';
import { captureSpanOf, getState, setState, upsertSegment } from './store';
import type { Source } from './types';

/** A recognised word; seconds, on whatever clock the caller says. */
export interface TimedWord {
  text: string;
  start: number;
  end: number;
}

/** A first-pass word and the speaker it is attributed to. */
export interface AttributedWord extends TimedWord {
  speaker: string;
}

/** One diarizer turn on a source's capture clock (seconds). */
export interface OverlapTurn {
  speaker: string;
  start: number;
  end: number;
}

/** Where two or more speakers talk at once, and who. */
export interface OverlapSpan {
  start: number;
  end: number;
  speakers: string[];
}

/** Words of `audio` (16 kHz mono), their times from the clip's first sample. */
export type TranscribeClip = (audio: Float32Array) => Promise<TimedWord[]>;

/** Shortest overlap worth a second pass: shorter ones rarely hide a word. */
export const MIN_RETRANSCRIBE_SECONDS = 0.6;
/** Audio kept either side of the overlap, so its edge words are whole. */
export const RETRANSCRIBE_PAD_SECONDS = 0.3;
/** How far apart two passes may place the same word. */
export const SAME_WORD_SECONDS = 0.5;

/** Every stretch of `turns` with two or more speakers for at least `minSeconds`. */
export function overlapSpans(turns: readonly OverlapTurn[], minSeconds = MIN_RETRANSCRIBE_SECONDS): OverlapSpan[] {
  const events: { at: number; speaker: string; delta: 1 | -1 }[] = [];
  for (const turn of turns) {
    if (turn.end <= turn.start) continue;
    events.push({ at: turn.start, speaker: turn.speaker, delta: 1 });
    events.push({ at: turn.end, speaker: turn.speaker, delta: -1 });
  }
  // A turn ending where the next begins does not overlap it.
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  const spans: OverlapSpan[] = [];
  const active = new Map<string, number>();
  let open: { start: number; speakers: Set<string> } | null = null;
  for (const { at, speaker, delta } of events) {
    const count = (active.get(speaker) ?? 0) + delta;
    if (count > 0) active.set(speaker, count);
    else active.delete(speaker);
    if (active.size >= 2) {
      open ??= { start: at, speakers: new Set() };
      for (const who of active.keys()) open.speakers.add(who);
    } else if (open) {
      if (at - open.start >= minSeconds) spans.push({ start: open.start, end: at, speakers: [...open.speakers] });
      open = null;
    }
  }
  return spans;
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

function mid(word: TimedWord): number {
  return (word.start + word.end) / 2;
}

/**
 * How far apart two passes may place the same two words in a row. A clip's
 * word times drift from the live windows' by more than `SAME_WORD_SECONDS`
 * (a second pass that heard the louder voice again added its whole phrase a
 * second time, "I I literally this might…" twice), but a pair of words in the
 * same order this close is the same speech.
 */
export const SAME_PHRASE_SECONDS = 2;

/** Whether `second[i]` and a neighbour are two consecutive words of `first`
 *  (in time order) within `SAME_PHRASE_SECONDS`. */
function inSamePhrase(first: readonly TimedWord[], second: readonly TimedWord[], i: number): boolean {
  const text = normalized(second[i].text);
  const at = mid(second[i]);
  return first.some((w, j) => {
    if (normalized(w.text) !== text || Math.abs(mid(w) - at) > SAME_PHRASE_SECONDS) return false;
    const before = i > 0 && j > 0 && normalized(second[i - 1].text) === normalized(first[j - 1].text);
    const after = i + 1 < second.length && j + 1 < first.length &&
      normalized(second[i + 1].text) === normalized(first[j + 1].text);
    return before || after;
  });
}

/**
 * The words of `second` inside `span` (by midpoint) that `first` does not
 * have: no first-pass word with the same text lies within `SAME_WORD_SECONDS`,
 * and the word is not one of a pair `first` has in a row nearby
 * (`SAME_PHRASE_SECONDS`). Each first-pass word vouches for one second-pass
 * word only by time.
 */
export function missedWords<T extends TimedWord>(first: readonly TimedWord[], second: readonly T[], span: OverlapSpan): T[] {
  const used = new Set<number>();
  const missed: T[] = [];
  const ordered = [...first].sort((a, b) => a.start - b.start);
  for (const [i, word] of second.entries()) {
    const text = normalized(word.text);
    if (!text || inSamePhrase(ordered, second, i)) continue;
    const at = mid(word);
    let match = -1;
    let gap = SAME_WORD_SECONDS;
    first.forEach((w, i) => {
      if (used.has(i) || normalized(w.text) !== text) return;
      const d = Math.abs(mid(w) - at);
      if (d <= gap) {
        match = i;
        gap = d;
      }
    });
    if (match >= 0) used.add(match);
    else if (at >= span.start && at < span.end) missed.push(word);
  }
  return missed;
}

/**
 * The speaker of `span` the first pass wrote down least: of the overlap's
 * speakers, the one fewest of its first-pass words (by midpoint) are
 * attributed to, the longest turn inside the span breaking a tie.
 */
export function quieterSpeaker(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
): string | null {
  if (span.speakers.length === 0) return null;
  const words = new Map<string, number>();
  for (const w of first) {
    const at = mid(w);
    if (at >= span.start && at < span.end) words.set(w.speaker, (words.get(w.speaker) ?? 0) + 1);
  }
  const time = new Map<string, number>();
  for (const t of turns) {
    const o = Math.min(span.end, t.end) - Math.max(span.start, t.start);
    if (o > 0) time.set(t.speaker, (time.get(t.speaker) ?? 0) + o);
  }
  return [...span.speakers].sort(
    (a, b) => (words.get(a) ?? 0) - (words.get(b) ?? 0) || (time.get(b) ?? 0) - (time.get(a) ?? 0),
  )[0];
}

/** The audio of `[start, end]` on the source's clock, clipped to what is held. */
export type AudioAt = (start: number, end: number) => { audio: Float32Array; start: number } | null;

/**
 * Transcribe `span` again (padded) and return the words the first pass
 * missed, on the source's clock, under the speaker it wrote down least.
 */
export async function retranscribeOverlap(
  span: OverlapSpan,
  first: readonly AttributedWord[],
  turns: readonly OverlapTurn[],
  audioAt: AudioAt,
  transcribe: TranscribeClip,
): Promise<AttributedWord[]> {
  const speaker = quieterSpeaker(span, first, turns);
  if (!speaker) return [];
  const clip = audioAt(span.start - RETRANSCRIBE_PAD_SECONDS, span.end + RETRANSCRIBE_PAD_SECONDS);
  if (!clip || clip.audio.length === 0) return [];
  const heard = (await transcribe(clip.audio)).map((w) => ({
    text: w.text,
    start: w.start + clip.start,
    end: w.end + clip.start,
  }));
  return missedWords(first, heard, span).map((w) => ({ ...w, speaker }));
}

/* ------------------------------------------------------------------ */
/* Live second pass                                                    */
/* ------------------------------------------------------------------ */

/** Seconds of each source's audio held for the second pass: an overlap is
 *  known once both its turns have closed, a few seconds after it ended, and
 *  it is transcribed `SETTLE_SECONDS` after that. */
export const HOLD_SECONDS = 40;
/** How long after an overlap ends the first pass is taken to have read it:
 *  the live chunker re-reads an utterance for up to 10 s. */
export const SETTLE_SECONDS = 12;

/** Id prefix of the segments this pass adds: the diarization bridge leaves
 *  their speaker alone, since the turns give those words to the louder voice. */
export const OVERLAP_SEGMENT_PREFIX = 'ovl-';

/** Whether a stored segment (its id possibly prefixed by an appended
 *  recording, `a<n>:`) was added by this pass. */
export function isOverlapPassSegment(id: string): boolean {
  return id.startsWith(OVERLAP_SEGMENT_PREFIX) || /^a\d+:ovl-/.test(id);
}

let transcriber: TranscribeClip | null = null;
const held = new Map<Source, { at: number; samples: Float32Array }[]>();
const closedTurns = new Map<Source, OverlapTurn[]>();
const handled = new Map<Source, OverlapSpan[]>();
const heardUntil = new Map<Source, number>();
let queue: Promise<void> = Promise.resolve();
/** Bumped by every reset: a pass still running for an earlier session drops its words. */
let epoch = 0;
/** Never reset: a segment id must not come back within a page's life. */
let segmentCounter = 0;

/**
 * Install the speech model the second pass transcribes with, or `null` to
 * stop it. Audio is held only while one is installed.
 */
export function setOverlapTranscriber(fn: TranscribeClip | null): void {
  transcriber = fn;
  if (!fn) held.clear();
}

/** Hold one captured frame (Int16 PCM at capture-clock sample `at`). */
export function pushOverlapAudio(source: Source, pcm: ArrayBuffer, at: number): void {
  if (!transcriber || pcm.byteLength < 2) return;
  const chunks = held.get(source) ?? [];
  const samples = int16ToFloat32(pcm);
  chunks.push({ at, samples });
  const until = at + samples.length;
  while (chunks.length > 0 && chunks[0].at + chunks[0].samples.length < until - HOLD_SECONDS * CAPTURE_SAMPLE_RATE) {
    chunks.shift();
  }
  held.set(source, chunks);
  const before = heardUntil.get(source) ?? 0;
  heardUntil.set(source, until / CAPTURE_SAMPLE_RATE);
  // Once a second is often enough to find an overlap that has settled.
  if (Math.floor(until / CAPTURE_SAMPLE_RATE) !== Math.floor(before)) schedule(source, false);
}

/** The held audio of `[start, end]` (seconds), clipped to what is held. */
function heldAudio(source: Source): AudioAt {
  return (start, end) => {
    const chunks = held.get(source) ?? [];
    if (chunks.length === 0) return null;
    const first = chunks[0].at;
    const last = chunks[chunks.length - 1];
    const from = Math.max(first, Math.round(start * CAPTURE_SAMPLE_RATE));
    const to = Math.min(last.at + last.samples.length, Math.round(end * CAPTURE_SAMPLE_RATE));
    if (to <= from) return null;
    const audio = new Float32Array(to - from);
    for (const { at, samples } of chunks) {
      const a = Math.max(from, at);
      const b = Math.min(to, at + samples.length);
      if (b > a) audio.set(samples.subarray(a - at, b - at), a - from);
    }
    return { audio, start: from / CAPTURE_SAMPLE_RATE };
  };
}

/** The diarizer's turns for `source` so far; only closed ones are used. */
export function noteOverlapTurns(source: Source, turns: readonly (OverlapTurn & { final?: boolean })[]): void {
  closedTurns.set(source, turns.filter((t) => t.final !== false));
  schedule(source, false);
}

/** The first pass's words near `span`, on the capture clock, with their
 *  speakers; the segment `skip` names is left out. */
function firstPassWords(source: Source, span: OverlapSpan, skip?: string): AttributedWord[] {
  const words: AttributedWord[] = [];
  const reach = SAME_PHRASE_SECONDS + 1;
  for (const seg of getState().segments) {
    if (seg.source !== source || !seg.words || seg.id === skip) continue;
    const placed = captureSpanOf(seg);
    if (!placed || placed.end < span.start - reach || placed.start > span.end + reach) continue;
    const offset = seg.start - placed.start;
    for (const w of seg.words) words.push({ text: w.text, start: w.start - offset, end: w.end - offset, speaker: seg.speaker });
  }
  return words;
}

/**
 * Drop from this pass's segments of `source` the words the first pass has
 * since written down too: the live chunker re-reads an utterance, and can be
 * behind the audio, so the first pass can reach an overlap's words only after
 * the second pass added them. A segment left with no words goes.
 */
function pruneDuplicatedPassWords(source: Source): void {
  for (const seg of getState().segments) {
    if (seg.source !== source || !isOverlapPassSegment(seg.id) || !seg.overlap || !seg.words?.length) continue;
    const placed = captureSpanOf(seg);
    if (!placed) continue;
    const offset = seg.start - placed.start;
    const words = seg.words.map((w) => ({ ...w, start: w.start - offset, end: w.end - offset }));
    const kept = missedWords(firstPassWords(source, seg.overlap, seg.id), words, seg.overlap);
    if (kept.length === words.length) continue;
    if (kept.length === 0) {
      setState({ segments: getState().segments.filter((s) => s.id !== seg.id) });
      continue;
    }
    const placedWords = kept.map(({ text, start, end }) => ({ text, start: start + offset, end: end + offset }));
    upsertSegment({
      ...seg,
      text: placedWords.map((w) => w.text).join(' '),
      start: placedWords[0].start,
      end: placedWords[placedWords.length - 1].end,
      words: placedWords,
    });
  }
}

/** Queue every overlap of `source` not handled yet whose first pass has
 *  settled (all of them when `all`, at Stop), after dropping the words the
 *  first pass has caught up on. */
function schedule(source: Source, all: boolean): void {
  const transcribe = transcriber;
  if (!transcribe) return;
  pruneDuplicatedPassWords(source);
  const turns = closedTurns.get(source) ?? [];
  const settled = (heardUntil.get(source) ?? 0) - SETTLE_SECONDS;
  const done = handled.get(source) ?? [];
  handled.set(source, done);
  for (const span of overlapSpans(turns)) {
    if (!all && span.end > settled) continue;
    if (done.some((d) => d.start < span.end && span.start < d.end)) continue;
    done.push(span);
    const run = epoch;
    queue = queue.then(async () => {
      if (run !== epoch) return;
      try {
        const heard = await retranscribeOverlap(span, firstPassWords(source, span), turns, heldAudio(source), transcribe);
        // The first pass may have written more while the clip waited and ran.
        const added = missedWords(firstPassWords(source, span), heard, span);
        if (run !== epoch || added.length === 0) return;
        upsertSegment({
          id: `${OVERLAP_SEGMENT_PREFIX}${++segmentCounter}`,
          source,
          speaker: added[0].speaker,
          text: added.map((w) => w.text).join(' '),
          start: added[0].start,
          end: added[added.length - 1].end,
          final: true,
          words: added.map(({ text, start, end }) => ({ text, start, end })),
          overlap: span,
        });
      } catch (err) {
        console.warn('[overlap] Second pass failed', err);
      }
    });
  }
}

/** Longest Stop waits for the second pass to finish. */
export const FLUSH_TIMEOUT_MS = 10_000;

/** Transcribe every overlap not handled yet (Stop), and wait for the pass,
 *  at most `timeoutMs`: what is still running then is dropped. */
export async function flushOverlapRetranscribe(timeoutMs = FLUSH_TIMEOUT_MS): Promise<void> {
  for (const source of closedTurns.keys()) schedule(source, true);
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([queue, new Promise<void>((resolve) => (timer = setTimeout(resolve, timeoutMs)))]);
  clearTimeout(timer);
}

/** Forget the session: its audio, turns and handled overlaps. */
export function resetOverlapRetranscribe(): void {
  epoch += 1;
  held.clear();
  closedTurns.clear();
  handled.clear();
  heardUntil.clear();
}
