import type { Segment, SegmentOverlap } from './types';

function sameOverlap(a: SegmentOverlap | undefined, b: SegmentOverlap | undefined): boolean {
  if (!a || !b) return a === b;
  return a.start === b.start && a.end === b.end && a.speakers.join() === b.speakers.join();
}

export function withOverlap(seg: Segment, overlap: SegmentOverlap | undefined): Segment {
  if (sameOverlap(seg.overlap, overlap)) return seg;
  if (overlap) return { ...seg, overlap };
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

export function overlapContaining(overlaps: readonly SegmentOverlap[], t: number): SegmentOverlap | undefined {
  return overlaps.find((o) => t >= o.start && t < o.end);
}
