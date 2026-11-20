import { describe, expect, it } from 'vitest';
import { referenceTurns } from './external-turns';

describe('referenceTurns', () => {
  it('sorts, drops empty turns, tags interrupts, backchannels and the crosstalk pair', () => {
    const turns = referenceTurns(
      [
        { start: 2, end: 5, spk: 'B', text: 'hello there' },
        { start: 0, end: 3, spk: 'A' },
        { start: 4, end: 4.5, spk: 'A' },
        { start: 6, end: 6, spk: 'C' },
      ],
      'nl',
    );
    expect(turns.map((t) => [t.speaker, t.startSec, t.endSec, t.event])).toEqual([
      ['A', 0, 3, 'turn'],
      ['B', 2, 5, 'interrupt'],
      ['A', 4, 4.5, 'backchannel'],
    ]);
    expect(turns.map((t) => t.pairId)).toEqual([0, 0, null]);
    expect(turns[0]).toMatchObject({ pairing: 'remote+remote', overlapFrac: 0.33, lang: 'nl', role: 'remote' });
    expect(turns[1].refText).toBe('hello there');
    expect('refText' in turns[0]).toBe(false);
  });

  it('leaves sequential turns unpaired', () => {
    const turns = referenceTurns(
      [
        { start: 0, end: 2, spk: 'A' },
        { start: 2, end: 4, spk: 'B' },
      ],
      'en',
    );
    expect(turns.map((t) => [t.event, t.pairId])).toEqual([
      ['turn', null],
      ['turn', null],
    ]);
  });
});
