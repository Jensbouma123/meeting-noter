import type { SpeakerTurn } from '@/lib/diarization/browser';
import type { Source } from './types';

const turns = new Map<Source, SpeakerTurn[]>();
const maxTurnLength = new Map<Source, number>();

export function turnsOf(source: Source): SpeakerTurn[] {
  return turns.get(source) ?? [];
}

export function longestTurnOf(source: Source): number {
  return maxTurnLength.get(source) ?? 0;
}

export function firstTurnReaching(source: Source, start: number): number {
  const list = turnsOf(source);
  const earliest = start - longestTurnOf(source);
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].start < earliest) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function insertTurn(turn: SpeakerTurn): void {
  const list = turns.get(turn.source) ?? [];
  if (turn.id !== undefined) {
    for (let j = list.length - 1; j >= 0; j -= 1) {
      if (list[j].id === turn.id) {
        list.splice(j, 1);
        break;
      }
    }
  }
  let i = list.length;
  while (i > 0 && list[i - 1].start > turn.start) i -= 1;
  list.splice(i, 0, turn);
  maxTurnLength.set(turn.source, Math.max(longestTurnOf(turn.source), turn.end - turn.start));
  turns.set(turn.source, list);
}

export function clearTurns(): void {
  turns.clear();
  maxTurnLength.clear();
}
