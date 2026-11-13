import type { Segment } from './types';

export const TURN_PAUSE_SECONDS = 30;

export function splitTurns<T extends Segment>(segments: readonly T[]): T[][] {
  const ordered = [...segments].sort((a, b) => a.start - b.start);
  const turns: T[][] = [];
  let lastEnd = 0;
  for (const seg of ordered) {
    const turn = turns[turns.length - 1];
    if (turn && turn[0].speaker === seg.speaker && seg.start - lastEnd <= TURN_PAUSE_SECONDS) {
      turn.push(seg);
      lastEnd = Math.max(lastEnd, seg.end, seg.start);
    } else {
      turns.push([seg]);
      lastEnd = Math.max(seg.end, seg.start);
    }
  }
  return turns;
}
