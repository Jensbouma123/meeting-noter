import { firstTurnReaching, longestTurnOf, turnsOf } from './diarization-turns';
import type { Source, SegmentOverlap } from './types';
import type { OpenOverlap, TurnEdge } from './types/diarization-bridge';

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
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  const found: SegmentOverlap[] = [];
  const active = new Map<string, number>();
  let open: OpenOverlap | null = null;
  for (const { at, speaker, delta } of events) {
    const count = (active.get(speaker) ?? 0) + delta;
    if (count > 0) active.set(speaker, count);
    else active.delete(speaker);
    if (active.size >= 2) {
      open ??= { start: at, speakers: new Set() };
      for (const who of active.keys()) open.speakers.add(who);
    } else if (open) {
      if (at - open.start >= MIN_OVERLAP_SECONDS && at > start && open.start < end) {
        found.push({ start: open.start, end: at, speakers: [...open.speakers] });
      }
      open = null;
    }
  }
  return found;
}
