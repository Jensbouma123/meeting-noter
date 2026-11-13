import type { Source } from './types';
import type { OverlapAt, OverlapTimeline } from './types/speaker-attribution';

let overlapTimeline: OverlapTimeline | null = null;

export function setOverlapTimeline(timeline: OverlapTimeline | null): void {
  overlapTimeline = timeline;
}

export function installedOverlaps(source: Source): OverlapAt | undefined {
  const timeline = overlapTimeline;
  return timeline ? (a, b) => timeline(source, a, b) : undefined;
}
