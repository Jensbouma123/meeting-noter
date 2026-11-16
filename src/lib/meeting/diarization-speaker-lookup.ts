import { firstTurnReaching, turnsOf } from './diarization-turns';
import type { SpeakerTurn } from '@/lib/diarization/browser';
import type { Source } from './types';

const TIE_SECONDS = 1e-6;

function pausedWithin(turn: SpeakerTurn, start: number, end: number): number {
  let paused = 0;
  for (const [a, b] of turn.pauses ?? []) paused += Math.max(0, Math.min(end, b) - Math.max(start, a));
  return paused;
}

export function speakerFor(source: Source, start: number, end: number): string | null {
  const time = new Map<string, number>();
  const spoken = new Map<string, number>();
  const depth = new Map<string, number>();
  const list = turnsOf(source);
  for (let i = firstTurnReaching(source, start); i < list.length; i += 1) {
    const turn = list[i];
    if (turn.start >= end) break;
    const overlap = Math.min(end, turn.end) - Math.max(start, turn.start);
    if (overlap <= 0) continue;
    time.set(turn.speaker, (time.get(turn.speaker) ?? 0) + overlap);
    spoken.set(turn.speaker, (spoken.get(turn.speaker) ?? 0) + overlap - pausedWithin(turn, start, end));
    const inside = Math.min(start - turn.start, turn.end - end);
    depth.set(turn.speaker, Math.max(depth.get(turn.speaker) ?? -Infinity, inside));
  }
  const winsTie = (a: string, b: string): boolean => {
    const more = spoken.get(a)! - spoken.get(b)!;
    return Math.abs(more) > TIE_SECONDS ? more > 0 : depth.get(a)! > depth.get(b)!;
  };
  let best: string | null = null;
  let bestTime = 0;
  for (const [speaker, t] of time) {
    const tie = best !== null && Math.abs(t - bestTime) <= TIE_SECONDS;
    if (tie ? winsTie(speaker, best!) : t > bestTime) {
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
