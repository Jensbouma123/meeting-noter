import { withOverlap } from './speaker-overlap-marks';
import type { Segment, SegmentWord } from './types';

export function segmentFamilyRoot(id: string): string {
  const at = id.indexOf('~');
  return at < 0 ? id : id.slice(0, at);
}

export function joinWords(words: readonly SegmentWord[]): string {
  return words.map((w) => w.text).join(' ');
}

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
