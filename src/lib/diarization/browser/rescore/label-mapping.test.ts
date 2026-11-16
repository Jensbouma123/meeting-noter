import { describe, expect, it } from 'vitest';
import { mapLabelsToChannels } from './label-mapping';

const grid = (...rows: string[]): Float32Array =>
  Float32Array.from(Array.from({ length: rows[0].length }, (_, t) => rows.map((r) => (r[t] === '#' ? 0.9 : 0))).flat());

describe('mapLabelsToChannels', () => {
  it('pairs labels with the channels they overlap most, greedily', () => {
    const fresh = grid('##....', '..####');
    const old = grid('####..', '....##');
    expect(Array.from(mapLabelsToChannels(fresh, 2, old, 2))).toEqual([0, 1]);
  });

  it('gives each channel to one label and sends leftovers past the old channels', () => {
    const fresh = grid('###...', '...###', '#.....');
    const old = grid('######', '......');
    expect(Array.from(mapLabelsToChannels(fresh, 3, old, 2))).toEqual([0, 2, 3]);
  });

  it('ignores probabilities at or below one half', () => {
    const fresh = Float32Array.from([0.5, 0.9, 0.5, 0.9]);
    const old = Float32Array.from([0.9, 0.9]);
    expect(Array.from(mapLabelsToChannels(fresh, 2, old, 1))).toEqual([1, 0]);
  });

  it('handles no old channels', () => {
    expect(Array.from(mapLabelsToChannels(grid('##', '##'), 2, new Float32Array(0), 0))).toEqual([0, 1]);
  });
});
