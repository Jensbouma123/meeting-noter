/**
 * Live transcription windows: which audio each inference sees, and how the
 * words it returns become transcript segments. Pure (no engine, no store), so
 * the policy can be tested without a model.
 *
 * Parakeet is an offline model. Handed back-to-back 2 s slices it transcribes
 * each one as a complete utterance: the word under a cut comes out as a
 * fragment on both sides ("I'm not." / "ing it."), every slice gets its own
 * sentence punctuation, and a quiet slice decodes to a lone ".". Carrying the
 * decoder state across slices does not help, because the encoder still sees no
 * audio on either side of the cut.
 *
 * So each source keeps one open utterance and every inference re-reads all of
 * it (up to 10 s). A word is committed only once two consecutive inferences
 * agree on it and it is well clear of the window's end, and the buffer is then
 * cut *between* words, so no word is ever split. A pause closes the segment;
 * silence, clicks and breaths are never sent to the model at all, and filler
 * that still comes back is never shown (`speech-gate.ts`).
 */

import { DEFAULT_SPEECH_GATE_CONFIG, SpeechGate, isNoiseText, type SpeechGateConfig } from './speech-gate';

export const LIVE_SAMPLE_RATE = 16_000;

/** One recognised word, times in seconds from the start of the window. */
export interface TimedWord {
  text: string;
  start: number;
  end: number;
  /** The model's confidence (0 … 1), when it reports one. */
  confidence?: number;
}

export interface LiveChunkerConfig extends SpeechGateConfig {
  /** New audio needed before the open utterance is re-read. */
  stepSamples: number;
  /** New audio needed for the first take of an utterance (none open yet), so
   *  the first partial shows as soon as the gate opens. */
  firstStepSamples: number;
  /** Trailing quiet after which one early non-final take picks up the last
   *  words, ahead of the pause that finalises. 0 disables. */
  earlyTailSamples: number;
  /** Once the window is this long, agreed words are committed and cut off. */
  trimAfterSamples: number;
  /** Longest window ever sent; past it, words are committed without agreement. */
  maxWindowSamples: number;
  /** Words ending this close to the window's end are never committed: the
   *  model has not heard what follows them yet. */
  keepTailSamples: number;
  /** Trailing quiet that ends an utterance. */
  pauseSamples: number;
  /** Silence kept ahead of speech, so a word's onset is not clipped. */
  leadInSamples: number;
  /** A segment is closed at the next commit once it spans this long. */
  maxSegmentSamples: number;
  /** Unvoiced frames (typing, a breath) count towards a pause, not only quiet ones. */
  pauseWhenUnvoiced: boolean;
}

const SR = LIVE_SAMPLE_RATE;
/** How far into a window a repeat of the word before the cut can start. */
const CUT_ECHO_SAMPLES = 0.3 * SR;

export const DEFAULT_LIVE_CHUNKER_CONFIG: Readonly<LiveChunkerConfig> = Object.freeze({
  // Against a 1.2 s / 8 s / 14 s setting on the AMI bench: 27 % less model
  // time for WER 0.567 instead of 0.561.
  stepSamples: 1.5 * SR,
  firstStepSamples: 0.2 * SR,
  earlyTailSamples: 0.25 * SR,
  trimAfterSamples: 6 * SR,
  maxWindowSamples: 10 * SR,
  keepTailSamples: 1.5 * SR,
  pauseSamples: 0.6 * SR,
  leadInSamples: 0.3 * SR,
  maxSegmentSamples: 20 * SR,
  pauseWhenUnvoiced: true,
  // Levels differ by 20 dB between a headset, a laptop mic across the room
  // and call audio through echo cancellation: a fixed 0.01 "silence" level
  // called almost every frame of a far-field recording a pause, and closed a
  // segment on every window. So speech and pauses are judged against the
  // source's own noise floor, and speech must also be voiced.
  ...DEFAULT_SPEECH_GATE_CONFIG,
});

/** Audio to transcribe now, on the capture timeline. */
export interface LiveWindowRequest {
  audio: Float32Array;
  /** Capture-timeline index of `audio[0]`. */
  startSample: number;
  /** The utterance ends with this window (a pause, or Stop). */
  final: boolean;
}

/** A transcript segment to insert or replace, by `id`. */
export interface LiveSegmentUpdate {
  id: string;
  text: string;
  startSample: number;
  endSample: number;
  final: boolean;
  /** The words `text` joins, on the capture timeline (samples); empty when
   *  the segment is closed with text no longer backed by words. */
  words: Word[];
}

/** A word on the capture timeline (samples). */
export interface Word {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

interface Chunk {
  samples: Float32Array;
  voiced: boolean;
}

/** Whether `text` holds anything but punctuation and whitespace. */
export function hasSpeech(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

/**
 * Fold punctuation-only "words" onto the word before them, and drop the ones
 * with nothing before them: a lone "." is not a word, and never a segment.
 */
export function cleanWords<T extends { text: string }>(words: readonly T[]): T[] {
  const out: T[] = [];
  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;
    if (hasSpeech(text)) {
      out.push({ ...word, text });
    } else if (out.length > 0) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { ...prev, text: prev.text + text };
    }
  }
  return out;
}

/** How many leading words two hypotheses agree on, ignoring case and punctuation. */
export function agreedPrefix(a: readonly { text: string }[], b: readonly { text: string }[]): number {
  let n = 0;
  while (n < a.length && n < b.length && normalize(a[n].text) === normalize(b[n].text)) n += 1;
  return n;
}

/** One source's live transcription state. */
export class LiveChunker {
  private readonly cfg: LiveChunkerConfig;
  private readonly newId: () => string;
  private chunks: Chunk[] = [];
  /** Capture-timeline index of the first buffered sample. */
  private bufStart = 0;
  private bufLen = 0;
  private sinceTake = 0;
  private trailingQuiet = 0;
  private voiced = false;
  /** The early tail take of the current pause has been issued. */
  private earlyTailTaken = false;
  /** A take of this utterance has run, so the fast first step is spent even
   *  if it opened no segment (filler, noise). */
  private firstTaken = false;
  private readonly gate: SpeechGate;
  private speechFrameCount = 0;
  private inFlight = false;
  /** The open segment: its id once shown, and the words committed to it. */
  private segId: string | null = null;
  private segWords: Word[] = [];
  private segText = '';
  /** The latest inference's words past the committed ones. */
  private hyp: Word[] = [];
  /** The last word committed before a cut inside speech: the next window may
   *  open on its tail, which is then not a new word. */
  private beforeCut: Word | null = null;

  constructor(newId: () => string, cfg: Partial<LiveChunkerConfig> = {}) {
    this.newId = newId;
    this.cfg = { ...DEFAULT_LIVE_CHUNKER_CONFIG, ...cfg };
    this.gate = new SpeechGate(this.cfg);
  }

  /** Buffered audio, in samples. */
  get buffered(): number {
    return this.bufLen;
  }

  /** The speech gate's current background level (frame RMS). */
  get noiseFloor(): number {
    return this.gate.noiseFloor;
  }

  /** Frames the speech gate has passed as speech so far. */
  get speechFrames(): number {
    return this.speechFrameCount;
  }

  /** Capture-timeline start of the open segment (its first word, or the
   *  buffer when nothing is recognised yet). */
  get openStartSample(): number {
    return this.segWords[0]?.start ?? this.hyp[0]?.start ?? this.bufStart;
  }

  /** Append captured audio. `at` is its capture-timeline index; omitted, the
   *  audio follows what is buffered. */
  push(samples: Float32Array, at?: number): void {
    if (samples.length === 0) return;
    if (this.bufLen === 0 && at !== undefined) this.bufStart = at;
    const frame = this.gate.push(samples);
    const voiced = frame.speech;
    if (voiced) this.speechFrameCount += 1;
    // Typing or a breath after the last word is no reason to keep the
    // utterance open: a pause is quiet, or at least not voiced.
    const quiet = frame.quiet || (this.cfg.pauseWhenUnvoiced && !frame.voiced);
    this.chunks.push({ samples, voiced });
    this.bufLen += samples.length;
    this.sinceTake += samples.length;
    this.trailingQuiet = quiet ? this.trailingQuiet + samples.length : 0;
    if (!quiet) this.earlyTailTaken = false;
    if (voiced) this.voiced = true;
    if (!this.voiced && !this.inFlight && !this.hasOpenSegment()) {
      // Nothing that is speech yet: keep a lead-in, plus a voiced run that
      // may still become speech, and never send it to the model.
      this.dropBefore(this.bufStart + this.bufLen - this.cfg.leadInSamples - frame.runSamples);
    }
    // A backlog (inference slower than real time) is capped rather than
    // queued: the oldest audio goes, whole words or not.
    const cap = this.cfg.maxWindowSamples * 2;
    if (this.bufLen > cap) this.dropBefore(this.bufStart + this.bufLen - cap);
  }

  /** Whether an inference should run now: enough new speech, or a pause
   *  that ends the open utterance. */
  due(): boolean {
    if (this.inFlight || this.bufLen === 0) return false;
    if (!this.voiced && !this.hasOpenSegment()) return false;
    const step = this.hasOpenSegment() || this.firstTaken ? this.cfg.stepSamples : this.cfg.firstStepSamples;
    if (this.voiced && this.sinceTake >= step) return true;
    if (this.sinceTake > 0 && this.trailingQuiet >= this.cfg.pauseSamples) return true;
    return this.earlyTailDue();
  }

  /** One non-final take per pause, once it is long enough to have ended the
   *  last word but not yet long enough to finalise. */
  private earlyTailDue(): boolean {
    const { earlyTailSamples, pauseSamples } = this.cfg;
    return (
      earlyTailSamples > 0 &&
      !this.earlyTailTaken &&
      this.voiced &&
      this.sinceTake > 0 &&
      this.trailingQuiet >= earlyTailSamples &&
      this.trailingQuiet < pauseSamples
    );
  }

  /** Whether an inference for this source is outstanding. */
  get busy(): boolean {
    return this.inFlight;
  }

  /**
   * The audio to transcribe now: the open utterance, up to the cap. `force`
   * ends the utterance with it (Stop) once the window holds all that is
   * buffered; a longer backlog is read a capped window at a time, each one
   * committing its settled words like a live window, so Stop never cuts a
   * word at the cap or drops the rest. Returns `null` when there is nothing
   * worth transcribing.
   */
  take(force = false): LiveWindowRequest | null {
    if (this.inFlight || this.bufLen === 0) return null;
    if (!this.voiced && !this.hasOpenSegment()) return null;
    const size = Math.min(this.bufLen, this.cfg.maxWindowSamples);
    const audio = new Float32Array(size);
    let filled = 0;
    for (const chunk of this.chunks) {
      if (filled >= size) break;
      const part = chunk.samples.subarray(0, size - filled);
      audio.set(part, filled);
      filled += part.length;
    }
    const final = size === this.bufLen && (force || this.trailingQuiet >= this.cfg.pauseSamples);
    if (this.trailingQuiet >= this.cfg.earlyTailSamples) this.earlyTailTaken = true;
    this.firstTaken = true;
    this.inFlight = true;
    this.sinceTake = 0;
    return { audio, startSample: this.bufStart, final };
  }

  /** The inference for `req` failed: keep its audio for the next attempt. */
  abort(): void {
    this.inFlight = false;
    if (!this.hasOpenSegment()) this.firstTaken = false;
  }

  /**
   * Apply the words recognised in `req`'s audio. `turnEnd` is a speaker turn
   * end (capture-timeline sample) the diarizer reported inside the open
   * segment: the segment is closed there, and what follows starts a new one.
   */
  apply(req: LiveWindowRequest, words: readonly TimedWord[], turnEnd?: number): LiveSegmentUpdate[] {
    this.inFlight = false;
    const winEnd = req.startSample + req.audio.length;
    let ws: Word[] = cleanWords(words).map((w) => ({
      text: w.text,
      start: req.startSample + Math.round(w.start * SR),
      end: req.startSample + Math.round(w.end * SR),
      confidence: w.confidence,
    }));
    if (this.beforeCut && ws.length > 0 && ws[0].start - req.startSample < CUT_ECHO_SAMPLES) {
      const tail = normalize(this.beforeCut.text);
      const head = normalize(ws[0].text);
      if (head && tail.endsWith(head)) ws.shift();
    }
    // A window that heard only "hmm", a letter or two, or nothing the model
    // is sure of, opens nothing; at the cap its audio is dropped.
    if (this.segWords.length === 0 && isNoiseText(ws, this.cfg)) ws = [];
    const updates: LiveSegmentUpdate[] = [];

    if (req.final) {
      this.segWords.push(...ws);
      this.hyp = [];
      this.close(updates, winEnd);
      this.dropBefore(winEnd);
      return updates;
    }

    const split = turnEnd !== undefined && turnEnd > this.openStartSample && turnEnd < winEnd;
    const before = split ? ws.filter((w) => (w.start + w.end) / 2 <= turnEnd).length : 0;
    if (split && (before > 0 || this.segWords.length > 0)) {
      this.segWords.push(...ws.slice(0, before));
      this.hyp = [];
      this.close(updates, turnEnd);
      const rest = ws.slice(before);
      this.dropBefore(rest.length > 0 ? Math.min(turnEnd, rest[0].start) : turnEnd);
      this.beforeCut = before > 0 ? ws[before - 1] : null;
      this.hyp = rest;
      this.show(updates, winEnd);
      return updates;
    }

    let commit = 0;
    if (req.audio.length >= this.cfg.trimAfterSamples) {
      const settled = winEnd - this.cfg.keepTailSamples;
      const agreed = agreedPrefix(this.hyp, ws);
      while (commit < agreed && ws[commit].end <= settled) commit += 1;
      if (commit === 0 && req.audio.length >= this.cfg.maxWindowSamples) {
        // No agreement within the cap: commit what has settled anyway, or drop
        // audio the model finds nothing in.
        while (commit < ws.length && ws[commit].end <= settled) commit += 1;
        if (commit === 0 && ws.length === 0) this.dropBefore(settled);
      }
    }
    if (commit > 0) {
      const last = ws[commit - 1];
      const next = ws[commit];
      // Between the two words. Word ends are loose (TDT durations often run
      // into the next word), starts are not: never cut past the next start.
      const cut = !next ? last.end : next.start >= last.end ? Math.round((last.end + next.start) / 2) : next.start;
      this.segWords.push(...ws.slice(0, commit));
      this.dropBefore(cut);
      this.beforeCut = last;
      this.hyp = ws.slice(commit);
      if (last.end - this.segWords[0].start >= this.cfg.maxSegmentSamples) {
        const rest = this.hyp;
        this.hyp = [];
        this.close(updates, last.end);
        this.hyp = rest;
        this.beforeCut = last;
      }
    } else {
      this.hyp = ws;
    }
    this.show(updates, winEnd);
    return updates;
  }

  /**
   * End the utterance without another inference (Stop, when its last window
   * could not run): the open segment is closed with the words already
   * recognised, and the audio no window will read is dropped.
   */
  finish(): LiveSegmentUpdate[] {
    const updates: LiveSegmentUpdate[] = [];
    if (this.hasOpenSegment()) this.close(updates, this.bufStart + this.bufLen);
    this.dropBefore(this.bufStart + this.bufLen);
    this.inFlight = false;
    return updates;
  }

  /** Samples buffered and not yet read by a final window. */
  get bufferedSamples(): number {
    return this.bufLen;
  }

  /** Forget everything (a new recording). */
  reset(): void {
    this.chunks = [];
    this.bufStart = 0;
    this.bufLen = 0;
    this.sinceTake = 0;
    this.trailingQuiet = 0;
    this.voiced = false;
    this.earlyTailTaken = false;
    this.firstTaken = false;
    this.gate.reset();
    this.inFlight = false;
    this.segId = null;
    this.segWords = [];
    this.segText = '';
    this.hyp = [];
    this.beforeCut = null;
  }

  /* ---------------------------------------------------------------- */

  private text(): string {
    return [...this.segWords, ...this.hyp].map((w) => w.text).join(' ');
  }

  /** Publish the open segment as it stands (not final). */
  private show(updates: LiveSegmentUpdate[], winEnd: number): void {
    const text = this.text();
    if (!hasSpeech(text) || isNoiseText([...this.segWords, ...this.hyp], this.cfg)) return;
    this.segId ??= this.newId();
    this.segText = text;
    const words = [...this.segWords, ...this.hyp];
    updates.push({
      id: this.segId,
      text,
      startSample: words[0].start,
      endSample: Math.min(winEnd, Math.max(words[words.length - 1].end, words[0].start)),
      final: false,
      words,
    });
  }

  /** Close the open segment with its committed words. A segment that never
   *  held a word emits nothing; one that was shown is closed with the last
   *  text shown, so it cannot be left open forever. */
  private close(updates: LiveSegmentUpdate[], end: number): void {
    const text = this.text();
    const words = [...this.segWords, ...this.hyp];
    if (hasSpeech(text) && !isNoiseText(words, this.cfg)) {
      updates.push({
        id: this.segId ?? this.newId(),
        text,
        startSample: words[0].start,
        endSample: Math.max(words[words.length - 1].end, words[0].start),
        final: true,
        words,
      });
    } else if (this.segId !== null) {
      updates.push({ id: this.segId, text: this.segText, startSample: this.bufStart, endSample: end, final: true, words: [] });
    }
    this.segId = null;
    this.segWords = [];
    this.segText = '';
    this.hyp = [];
    this.beforeCut = null;
    this.firstTaken = false;
  }

  private hasOpenSegment(): boolean {
    return this.segId !== null || this.segWords.length > 0 || this.hyp.length > 0;
  }

  /** Drop buffered audio before capture-timeline index `at`. */
  private dropBefore(at: number): void {
    let drop = Math.min(this.bufLen, Math.max(0, Math.round(at) - this.bufStart));
    if (drop === 0) return;
    this.bufStart += drop;
    this.bufLen -= drop;
    this.sinceTake = Math.min(this.sinceTake, this.bufLen);
    this.trailingQuiet = Math.min(this.trailingQuiet, this.bufLen);
    while (drop > 0 && this.chunks.length > 0) {
      const head = this.chunks[0];
      if (head.samples.length <= drop) {
        drop -= head.samples.length;
        this.chunks.shift();
      } else {
        this.chunks[0] = { samples: head.samples.subarray(drop), voiced: head.voiced };
        drop = 0;
      }
    }
    this.voiced = this.chunks.some((c) => c.voiced);
  }
}
