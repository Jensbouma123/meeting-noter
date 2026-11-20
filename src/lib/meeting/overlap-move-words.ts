import { captureSpanOf } from './append-mode';
import { upsertSegment } from './segment-store';
import { getState, setState } from './store-core';
import type { Source } from './types';
import type { AttributedWord } from './types/overlap-retranscribe';

const SAME_TIME_SECONDS = 1e-6;

// Takes words separation re-attributed out of the lines they were first heard in; the caller re-adds them as
// overlap-pass lines, which the diarizer relabel leaves alone, so a merged line splits for good.
export function removeFirstPassWords(source: Source, moved: readonly AttributedWord[]): void {
  if (moved.length === 0) return;
  for (const seg of getState().segments) {
    if (seg.source !== source || !seg.words?.length) continue;
    const placed = captureSpanOf(seg);
    if (!placed) continue;
    const offset = seg.start - placed.start;
    const isMoved = (w: { text: string; start: number }) =>
      moved.some((m) => m.speaker === seg.speaker && m.text === w.text && Math.abs(m.start - (w.start - offset)) < SAME_TIME_SECONDS);
    const kept = seg.words.filter((w) => !isMoved(w));
    if (kept.length === seg.words.length) continue;
    if (kept.length === 0) {
      setState({ segments: getState().segments.filter((s) => s.id !== seg.id) });
      continue;
    }
    const { lowConfSpans: _charSpans, ...rest } = seg;
    upsertSegment({ ...rest, text: kept.map((w) => w.text).join(' '), start: kept[0].start, end: kept[kept.length - 1].end, words: kept });
  }
}
