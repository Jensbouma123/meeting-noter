import type { HypSegment } from '../types/hyp-segment';
import type { TurnLines } from '../types/over-split';
import type { RefTurn } from '../types/ref-turn';

export const MAX_TURN_SEC = 15;
export const MAX_LINES = 2;
const COVER = 0.5;

const overlap = (a0: number, a1: number, b0: number, b1: number): number => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

const coversTurn = (s: HypSegment, t: RefTurn): boolean =>
  s.text.trim() !== '' && overlap(s.start, s.end, t.start, t.end) / Math.max(0.01, Math.min(s.end - s.start, t.end - t.start)) >= COVER;

export function turnLines(turns: RefTurn[], segs: HypSegment[]): TurnLines[] {
  return turns
    .filter((t) => t.end - t.start <= MAX_TURN_SEC && t.event !== 'backchannel')
    .map((t) => ({ event: t.event ?? 'turn', lines: segs.filter((s) => coversTurn(s, t)).length }));
}

export const isOverSplit = (t: TurnLines): boolean => t.lines > MAX_LINES;

export function overSplitRate(rows: TurnLines[]): number | null {
  return rows.length ? rows.filter(isOverSplit).length / rows.length : null;
}
