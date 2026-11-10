/**
 * Speakers per word rather than per line.
 *
 * The diarizer reports a turn only once it has closed, seconds after the
 * words in it were transcribed, so a live line is often final before the
 * speaker change inside it is known. A line keeps its words (`Segment.words`),
 * and when a turn arrives each word gets the speaker whose turn covers it: a
 * line whose words belong to two speakers is split between them, the first
 * part keeping the line's id and the others named `${id}~${n}` (`n` the index
 * of their first word). The parts stay one family: the next turn re-reads the
 * whole family, so a boundary can move or the parts merge back.
 *
 * Open lines are split too, and so are the words the diarizer has not reached
 * yet (no turn ends past them) from those it has: those words are a guess, and
 * are shown as one. Labelled whole, an open line whose first word the last
 * speaker's turn covered showed the next speaker's words confirmed under the
 * last speaker until it closed: on the AMI replay
 * (`scripts/live-diarization-replay.test.ts`, Parakeet's words) 21 % of words
 * were first confirmed under the wrong speaker, against 16 % once every turn
 * is in; split like this, 17 %.
 *
 * Where two or more speakers' turns overlap, the words in that stretch are
 * cut off into parts of their own, each still one speaker's, and marked with
 * the overlap (`Segment.overlap`) so the transcript can show them side by
 * side.
 */

import type { LiveSegmentUpdate } from '@/lib/asr/live-chunker';
import type { SpeakerTimeline } from './browser-asr';
import { replaceSegmentFamily, upsertSegment } from './store';
import { CAPTURE_SAMPLE_RATE } from './pcm';
import type { Segment, SegmentOverlap, SegmentWord, Source } from './types';

/** Who spoke `[start, end]`, or `null` when no turn says. */
export type SpeakerAt = (start: number, end: number) => string | null;

/** The overlaps that intersect `[start, end]`, on the same clock. */
export type OverlapAt = (start: number, end: number) => SegmentOverlap[];

/** `OverlapAt` for one source, on the capture clock. */
export type OverlapTimeline = (source: Source, start: number, end: number) => SegmentOverlap[];

let overlapTimeline: OverlapTimeline | null = null;

/**
 * Install the diarizer's overlap lookup (`diarization-bridge.ts`), or `null`
 * to stop marking overlaps. `attributeSpeakers` and `publishLiveUpdate` read
 * it for a segment on the capture clock when their caller passes no lookup of
 * its own: `browser-asr.ts` labels through them with the speaker lookups
 * alone.
 */
export function setOverlapTimeline(timeline: OverlapTimeline | null): void {
  overlapTimeline = timeline;
}

function sameOverlap(a: SegmentOverlap | undefined, b: SegmentOverlap | undefined): boolean {
  if (!a || !b) return a === b;
  return a.start === b.start && a.end === b.end && a.speakers.join() === b.speakers.join();
}

/** `seg` with `overlap` as given (removed when undefined); `seg` itself when already so. */
function withOverlap(seg: Segment, overlap: SegmentOverlap | undefined): Segment {
  if (sameOverlap(seg.overlap, overlap)) return seg;
  if (overlap) return { ...seg, overlap };
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

/** The overlap `t` lies in, if any. */
function overlapAt(overlaps: readonly SegmentOverlap[], t: number): SegmentOverlap | undefined {
  return overlaps.find((o) => t >= o.start && t < o.end);
}

/** Whether the diarizer has reached `t`: some turn `covered` knows ends past it. */
function diarizedAt(t: number, covered: SpeakerAt): boolean {
  return covered(t, Infinity) !== null;
}

/**
 * How far past a part the diarizer must have got, no turn covering it, for
 * the nearest turn's speaker to count as confirmed. Speech the diarizer calls
 * silence (the stretch before a source's first turn, above all) is never
 * covered: waiting for a turn there left it pending until Stop.
 */
export const UNCOVERED_CONFIRM_SECONDS = 2;

/**
 * `parts` with `unconfirmed` set for each whose last word the diarizer has
 * not reached, or whose span `covered` (a lookup by turn overlap alone, not
 * the nearest-turn guess) gives no speaker while the diarizer is still within
 * `UNCOVERED_CONFIRM_SECONDS` of it. A part already right is returned as is.
 */
export function withConfirmation(parts: Segment[], covered: SpeakerAt): Segment[] {
  return parts.map((part) => {
    const last = part.words?.[part.words.length - 1]?.start ?? part.start;
    const unconfirmed = !diarizedAt(last, covered) ||
      (covered(part.start, part.end) === null && !diarizedAt(part.end + UNCOVERED_CONFIRM_SECONDS, covered));
    if (!!part.unconfirmed === unconfirmed) return part;
    const rest = { ...part };
    delete rest.unconfirmed;
    return unconfirmed ? { ...rest, unconfirmed } : rest;
  });
}

/** The id of the segment a part was split from (itself when unsplit). */
export function segmentFamilyRoot(id: string): string {
  const at = id.indexOf('~');
  return at < 0 ? id : id.slice(0, at);
}

function joinWords(words: readonly SegmentWord[]): string {
  return words.map((w) => w.text).join(' ');
}

/** A family's parts as the one segment they were split from. Their overlaps
 *  are each part's own, so the merged segment has none: splitting it again
 *  finds them. */
export function mergeFamily(parts: readonly Segment[]): Segment {
  if (parts.length === 1) return parts[0];
  const ordered = [...parts].sort((a, b) => a.start - b.start);
  const words = ordered.flatMap((p) => p.words ?? []);
  return {
    ...withOverlap(ordered[0], undefined),
    id: segmentFamilyRoot(ordered[0].id),
    text: ordered.map((p) => p.text).join(' '),
    start: ordered[0].start,
    end: ordered.reduce((m, p) => Math.max(m, p.end), ordered[0].end),
    final: ordered.every((p) => p.final),
    words,
  };
}

/**
 * `seg` as one segment per run of one speaker's words. Only a segment whose
 * text is exactly its words is split; an open one is, too, as long as it is
 * written back as a family (`replaceSegmentFamily`), since the next inference
 * rewrites it under its own id. A word no turn covers takes its neighbour's
 * speaker; with none known the segment keeps its own. Given `covered`, the
 * words the diarizer has not reached yet are a run of their own, so that
 * `withConfirmation` can tell them apart. Given `overlapsAt`, a word's part
 * is also cut where it enters or leaves an overlap (by the word's midpoint),
 * and each part inside one carries it; without it, `overlap` is left as it
 * is. Returns `[seg]` itself when nothing changes.
 */
export function splitBySpeaker(
  seg: Segment,
  speakerAt: SpeakerAt,
  covered?: SpeakerAt,
  overlapsAt?: OverlapAt,
): Segment[] {
  const words = seg.words;
  const overlaps = overlapsAt?.(seg.start, seg.end) ?? [];
  const mark = (part: Segment, overlap: SegmentOverlap | undefined): Segment =>
    overlapsAt ? withOverlap(part, overlap) : part;
  const whole = (): Segment[] => {
    const speaker = speakerAt(seg.start, seg.end) ?? seg.speaker;
    const overlap = overlapAt(overlaps, (seg.start + seg.end) / 2);
    return [mark(speaker === seg.speaker ? seg : { ...seg, speaker }, overlap)];
  };
  if (!words || words.length === 0 || joinWords(words) !== seg.text) return whole();

  const labels = words.map((w) => speakerAt(w.start, w.end));
  for (let i = 1; i < labels.length; i += 1) labels[i] ??= labels[i - 1];
  for (let i = labels.length - 2; i >= 0; i -= 1) labels[i] ??= labels[i + 1];
  if (labels[0] === null) return whole();
  const reached = words.map((w) => !covered || diarizedAt(w.start, covered));
  const inOverlap = words.map((w) => overlapAt(overlaps, (w.start + w.end) / 2));

  const runs: { from: number; to: number; speaker: string; reached: boolean; overlap?: SegmentOverlap }[] = [];
  labels.forEach((speaker, i) => {
    const last = runs[runs.length - 1];
    if (last && last.speaker === speaker && last.reached === reached[i] && last.overlap === inOverlap[i]) last.to = i + 1;
    else runs.push({ from: i, to: i + 1, speaker: speaker as string, reached: reached[i], overlap: inOverlap[i] });
  });
  if (runs.length === 1) {
    const { speaker, overlap } = runs[0];
    return [mark(speaker === seg.speaker ? seg : { ...seg, speaker }, overlap)];
  }

  return runs.map((run, k) => {
    const part = words.slice(run.from, run.to);
    return mark({
      ...seg,
      id: k === 0 ? seg.id : `${seg.id}~${run.from}`,
      speaker: run.speaker,
      text: joinWords(part),
      start: k === 0 ? seg.start : part[0].start,
      end: k === runs.length - 1 ? seg.end : part[part.length - 1].end,
      words: part,
    }, run.overlap);
  });
}

/** The installed overlap lookup for `source`'s capture clock, if any. */
function installedOverlaps(source: Source): OverlapAt | undefined {
  const timeline = overlapTimeline;
  return timeline ? (a, b) => timeline(source, a, b) : undefined;
}

/**
 * `seg` split per speaker by `near` (the nearest-turn guess), each part
 * marked unconfirmed where `covered` (turn overlap alone) cannot vouch for it,
 * and cut out where `overlaps` says speakers overlap. Without `overlaps`, the
 * lookup `setOverlapTimeline` installed is used, `seg` being on the capture
 * clock.
 */
export function attributeSpeakers(
  seg: Segment,
  near: SpeakerAt,
  covered: SpeakerAt,
  overlaps: OverlapAt | undefined = installedOverlaps(seg.source),
): Segment[] {
  return withConfirmation(splitBySpeaker(seg, near, covered, overlaps), covered);
}

/**
 * Write one live chunker update to the store: the speaker the timeline gives
 * its span (else `fallbackSpeaker`), split per speaker where the turns already
 * known say its words change hands.
 *
 * The line is shown at once under that speaker, a guess while no turn covers
 * it yet (turns are seconds behind the text). A span no turn overlaps takes
 * the nearest turn's speaker, as `diarization-bridge.ts` relabels it: read by
 * overlap alone, each partial of a line the bridge had just labelled would
 * put the guess back, and the label would flip until the line closed.
 */
export function publishLiveUpdate(
  source: Source,
  update: LiveSegmentUpdate,
  timeline: SpeakerTimeline | null,
  fallbackSpeaker: () => string,
): void {
  const start = update.startSample / CAPTURE_SAMPLE_RATE;
  const end = update.endSample / CAPTURE_SAMPLE_RATE;
  const seg: Segment = {
    id: update.id,
    source,
    speaker: timeline?.speakerNear(source, start, end) ?? fallbackSpeaker(),
    text: update.text,
    start,
    end,
    final: update.final,
    words: update.words.map((w) => ({ text: w.text, start: w.start / CAPTURE_SAMPLE_RATE, end: w.end / CAPTURE_SAMPLE_RATE })),
  };
  if (!timeline) {
    upsertSegment(seg);
    return;
  }
  replaceSegmentFamily(
    seg.id,
    attributeSpeakers(
      seg,
      (a, b) => timeline.speakerNear(source, a, b),
      (a, b) => timeline.speakerFor(source, a, b),
    ),
  );
}
