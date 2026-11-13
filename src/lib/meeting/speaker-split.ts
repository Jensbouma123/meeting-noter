import { diarizedAt } from './speaker-confirmation';
import { joinWords } from './speaker-family';
import { overlapContaining, withOverlap } from './speaker-overlap-marks';
import type { Segment, SegmentOverlap } from './types';
import type { OverlapAt, SpeakerAt, SpeakerRun } from './types/speaker-attribution';

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
    const overlap = overlapContaining(overlaps, (seg.start + seg.end) / 2);
    return [mark(speaker === seg.speaker ? seg : { ...seg, speaker }, overlap)];
  };
  if (!words || words.length === 0 || joinWords(words) !== seg.text) return whole();

  const labels = words.map((w) => speakerAt(w.start, w.end));
  for (let i = 1; i < labels.length; i += 1) labels[i] ??= labels[i - 1];
  for (let i = labels.length - 2; i >= 0; i -= 1) labels[i] ??= labels[i + 1];
  if (labels[0] === null) return whole();
  const reached = words.map((w) => !covered || diarizedAt(w.start, covered));
  const inOverlap = words.map((w) => overlapContaining(overlaps, (w.start + w.end) / 2));

  const runs: SpeakerRun[] = [];
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
