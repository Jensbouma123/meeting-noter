import { firstTurnReaching, longestTurnOf, turnsOf } from './diarization-turns';
import type { Source, SegmentOverlap } from './types';
import { sortEdges, sweepOverlaps } from './overlap-sweep';
import type { TurnEdge } from './types/diarization-bridge';

export const MIN_OVERLAP_SECONDS = 0.4;

export function overlapsIn(source: Source, start: number, end: number): SegmentOverlap[] {
  const list = turnsOf(source);
  const reach = longestTurnOf(source);
  const events: TurnEdge[] = [];
  for (let i = firstTurnReaching(source, start - reach); i < list.length; i += 1) {
    const turn = list[i];
    if (turn.start >= end + reach) break;
    if (turn.end <= start - reach || turn.end <= turn.start) continue;
    events.push({ at: turn.start, speaker: turn.speaker, delta: 1 });
    events.push({ at: turn.end, speaker: turn.speaker, delta: -1 });
  }
  sortEdges(events);
  return sweepOverlaps(
    events,
    (span) => span.end - span.start >= MIN_OVERLAP_SECONDS && span.end > start && span.start < end,
  );
}
