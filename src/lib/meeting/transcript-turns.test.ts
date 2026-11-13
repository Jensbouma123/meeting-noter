import { describe, expect, it } from 'vitest';
import { splitTurns } from './transcript-turns';
import { seg } from './export.testUtils';
import type { Segment } from './types';

describe('splitTurns', () => {
  const line = (id: string, speaker: string, start: number, end = start + 2) =>
    seg({ id, speaker, source: speaker.startsWith('mic') ? 'mic' : 'system', start, end });
  const ids = (turns: Segment[][]) => turns.map((t) => t.map((s) => s.id));

  it('orders by start time, whatever order segments arrived in', () => {
    expect(ids(splitTurns([line('b', 'mic:0', 5), line('a', 'mic:0', 1), line('c', 'mic:0', 9)]))).toEqual([
      ['a', 'b', 'c'],
    ]);
  });

  it('starts a turn on every speaker change, also back to an earlier speaker', () => {
    const turns = splitTurns([
      line('a', 'mic:0', 0),
      line('b', 'mic:1', 3),
      line('c', 'mic:0', 6),
      line('d', 'system:0', 9),
    ]);
    expect(ids(turns)).toEqual([['a'], ['b'], ['c'], ['d']]);
  });

  it('starts a turn after a pause over 30 s, even for the same speaker', () => {
    const turns = splitTurns([
      line('a', 'mic:0', 0, 4),
      line('b', 'mic:0', 34, 36),
      line('c', 'mic:0', 66.5, 68),
    ]);
    expect(ids(turns)).toEqual([['a', 'b'], ['c']]);
  });

  it('moves a line into the right turn when its speaker is reassigned', () => {
    const before = [line('a', 'mic:0', 0), line('b', 'mic:0', 3), line('c', 'mic:0', 6)];
    expect(ids(splitTurns(before))).toEqual([['a', 'b', 'c']]);
    const after = [before[0], { ...before[1], speaker: 'mic:1' }, before[2]];
    expect(ids(splitTurns(after))).toEqual([['a'], ['b'], ['c']]);
  });
});
