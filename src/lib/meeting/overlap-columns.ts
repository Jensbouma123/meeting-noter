import type { Segment } from './types';
import type { OverlapColumn } from './types/export';

export const OVERLAP_MIN_WORDS = 2;
export const OVERLAP_MIN_SECONDS = 0.8;

function speechSeconds(seg: Segment): number {
  const words = seg.words;
  if (!words?.length) return Math.max(0, seg.end - seg.start);
  return Math.max(0, words[words.length - 1].end - words[0].start);
}

export function wordCount(seg: Segment): number {
  return seg.words?.length || seg.text.split(/\s+/).filter(Boolean).length;
}

export function columnsHold(columns: ReadonlyMap<string, OverlapColumn>): boolean {
  if (columns.size < 2) return false;
  return [...columns.values()].every((c) => c.words >= OVERLAP_MIN_WORDS || c.seconds >= OVERLAP_MIN_SECONDS - 1e-6);
}

export function everyColumnHolds(segs: readonly Segment[]): boolean {
  const columns = new Map<string, OverlapColumn>();
  for (const seg of segs) {
    const c = columns.get(seg.speaker) ?? { words: 0, seconds: 0 };
    c.words += wordCount(seg);
    c.seconds += speechSeconds(seg);
    columns.set(seg.speaker, c);
  }
  return columnsHold(columns);
}
