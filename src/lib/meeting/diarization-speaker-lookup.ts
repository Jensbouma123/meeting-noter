import { firstTurnReaching, turnsOf } from './diarization-turns';
import type { Source } from './types';

const TIE_SECONDS = 1e-6;

export function speakerFor(source: Source, start: number, end: number): string | null {
  const time = new Map<string, number>();
  const depth = new Map<string, number>();
  const list = turnsOf(source);
  for (let i = firstTurnReaching(source, start); i < list.length; i += 1) {
    const turn = list[i];
    if (turn.start >= end) break;
    const overlap = Math.min(end, turn.end) - Math.max(start, turn.start);
    if (overlap <= 0) continue;
    time.set(turn.speaker, (time.get(turn.speaker) ?? 0) + overlap);
    const inside = Math.min(start - turn.start, turn.end - end);
    depth.set(turn.speaker, Math.max(depth.get(turn.speaker) ?? -Infinity, inside));
  }
  let best: string | null = null;
  let bestTime = 0;
  for (const [speaker, t] of time) {
    const tie = best !== null && Math.abs(t - bestTime) <= TIE_SECONDS;
    if (tie ? depth.get(speaker)! > depth.get(best!)! : t > bestTime) {
      best = speaker;
      bestTime = Math.max(t, bestTime);
    }
  }
  return best;
}

export function speakerNear(source: Source, start: number, end: number): string | null {
  const found = speakerFor(source, start, end);
  if (found) return found;
  let best: string | null = null;
  let bestGap = Infinity;
  for (const turn of turnsOf(source)) {
    const gap = turn.start >= end ? turn.start - end : start - turn.end;
    if (gap < bestGap) {
      best = turn.speaker;
      bestGap = gap;
    }
  }
  return best;
}
