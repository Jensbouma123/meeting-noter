import { describe, expect, it } from 'vitest';
import { fitToMix, padMix, splitSources, validLength } from './mossformer2-io';

describe('mossformer2 io', () => {
  it('pads to a stride multiple plus the edge', () => {
    expect(validLength(8)).toBe(8);
    expect(validLength(9)).toBe(2056);
    expect(validLength(2056)).toBe(2056);
    expect(validLength(2057)).toBe(4104);
    const padded = padMix(Float32Array.from([1, 2, 3]));
    expect(padded.length).toBe(8);
    expect(Array.from(padded.subarray(0, 4))).toEqual([1, 2, 3, 0]);
  });

  it('scales a track by its least-squares gain onto the mix', () => {
    const mix = Float32Array.from([2, -4, 6]);
    const track = Float32Array.from([1, -2, 3]);
    expect(Array.from(fitToMix(track, mix)).map((v) => Math.round(v * 1e4) / 1e4)).toEqual([2, -4, 6]);
  });

  it('trims both padded sources back to the mix length', () => {
    const mix = Float32Array.from([1, 1, 1]);
    const sources = new Float32Array(16);
    sources.set([0.5, 0.5, 0.5], 0);
    sources.set([2, 2, 2], 8);
    const [a, b] = splitSources(sources, mix);
    expect(a.length).toBe(3);
    expect(b.length).toBe(3);
    expect(a[0]).toBeCloseTo(1);
    expect(b[2]).toBeCloseTo(1);
  });
});
