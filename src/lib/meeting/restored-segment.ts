import type { Segment } from './types';

export function restoredSegment(seg: Segment): Segment {
  if (seg.overlap === undefined) return seg;
  const o = seg.overlap as Partial<Record<keyof NonNullable<Segment['overlap']>, unknown>> | null;
  const valid =
    typeof o === 'object' && o !== null &&
    typeof o.start === 'number' &&
    typeof o.end === 'number' &&
    Array.isArray(o.speakers) &&
    o.speakers.every((id) => typeof id === 'string');
  if (valid) return seg;
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

export function restorableSegments(segments: Segment[]): Segment[] {
  return segments.filter((s) => s && typeof s.id === 'string' && s.final === true).map(restoredSegment);
}
