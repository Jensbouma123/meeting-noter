import type { Segment } from './types';
import type { SpeakerAt } from './types/speaker-attribution';

export const UNCOVERED_CONFIRM_SECONDS = 2;

export function diarizedAt(t: number, covered: SpeakerAt): boolean {
  return covered(t, Infinity) !== null;
}

export function withConfirmation(parts: Segment[], covered: SpeakerAt): Segment[] {
  return parts.map((part) => {
    const last = part.words?.[part.words.length - 1]?.start ?? part.start;
    const unconfirmed = !diarizedAt(last, covered) ||
      (covered(part.start, part.end) === null && !diarizedAt(part.end + UNCOVERED_CONFIRM_SECONDS, covered));
    if (!!part.unconfirmed === unconfirmed) return part;
    const rest = { ...part };
    delete rest.unconfirmed;
    return unconfirmed ? { ...rest, unconfirmed } : rest;
  });
}
