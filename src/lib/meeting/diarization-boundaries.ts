import type { SpeakerTurn } from '@/lib/diarization/browser';
import { firstTurnReaching, turnsOf } from './diarization-turns';
import type { Source } from './types';

export function changePoints(source: Source, start: number, end: number): number[] {
  const points: number[] = [];
  const list = turnsOf(source);
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const next = list[i];
    if (prev.speaker === next.speaker) continue;
    const at = prev.end <= next.start ? (prev.end + next.start) / 2 : next.start;
    if (at > start && at < end) points.push(at);
  }
  return points;
}

function talkedThrough(list: readonly SpeakerTurn[], turn: SpeakerTurn): boolean {
  const before = new Set<string>();
  const after = new Set<string>();
  for (let i = firstTurnReaching(turn.source, turn.start); i < list.length; i += 1) {
    const other = list[i];
    if (other.start > turn.end) break;
    if (other.speaker === turn.speaker) continue;
    if (other.start < turn.start && other.end >= turn.start) before.add(other.speaker);
    if (other.start <= turn.end && other.end > turn.end) after.add(other.speaker);
  }
  for (const speaker of before) if (after.has(speaker)) return true;
  return false;
}

export function turnEnds(source: Source, start: number, end: number): number[] {
  const list = turnsOf(source);
  return list
    .filter((turn) => turn.final !== false && !turn.continues)
    .filter((turn) => turn.end > start && turn.end < end && !talkedThrough(list, turn))
    .map((turn) => turn.end);
}
