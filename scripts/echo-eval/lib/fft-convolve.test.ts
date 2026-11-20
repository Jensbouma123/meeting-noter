import { describe, expect, it } from 'vitest';
import { convolve, convolveBlocks } from './fft-convolve';
import { makeRng } from './rng';

const noise = (len: number, seed: number): Float32Array => {
  const rng = makeRng(seed);
  return Float32Array.from({ length: len }, () => rng() - 0.5);
};

const direct = (x: Float32Array, h: Float32Array): Float32Array => {
  const out = new Float32Array(x.length + h.length - 1);
  x.forEach((v, i) => h.forEach((w, j) => (out[i + j] += v * w)));
  return out;
};

describe('convolve', () => {
  it('matches direct convolution on short input', () => {
    const x = noise(500, 1);
    const h = noise(37, 2);
    const want = direct(x, h);
    convolve(x, h).forEach((v, i) => expect(v).toBeCloseTo(want[i], 4));
  });

  it('overlap-add blocks match the full FFT across several block boundaries', () => {
    const x = noise(200_000, 3);
    const h = noise(9_600, 4);
    const full = convolve(x, h);
    const blocks = convolveBlocks(x, h);
    expect(blocks.length).toBe(full.length);
    expect(full.reduce((m, v) => Math.max(m, Math.abs(v)), 0)).toBeGreaterThan(1);
    expect(full.reduce((m, v, i) => Math.max(m, Math.abs(v - blocks[i])), 0)).toBeLessThan(1e-3);
  });
});
