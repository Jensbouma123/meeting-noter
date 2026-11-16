import { describe, expect, it } from 'vitest';
import { denseAverageLinkage } from './ahc-dense-test-support';
import { averageLinkage } from './ahc';

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}

function clusteredEmbeddings(n: number, d: number, speakers: number, seed: number): Float32Array {
  const rand = seeded(seed);
  const centres = Array.from({ length: speakers }, () => Array.from({ length: d }, rand));
  const out = new Float32Array(n * d);
  for (let i = 0; i < n; i += 1) {
    const centre = centres[Math.floor((rand() + 0.5) * speakers) % speakers];
    const row = centre.map((x) => x + 0.6 * rand());
    const norm = Math.hypot(...row);
    row.forEach((x, c) => (out[i * d + c] = x / norm));
  }
  return out;
}

describe('averageLinkage against the dense reference', () => {
  it.each([
    [40, 8, 3, 1, 0.35, 16],
    [120, 16, 6, 2, 0.35, 16],
    [200, 32, 12, 3, 0.35, 4],
    [150, 24, 20, 4, 0.1, 16],
    [90, 8, 2, 5, 0.9, 16],
  ])('n=%i d=%i speakers=%i seed=%i tau=%f cap=%i merges identically', (n, d, speakers, seed, tau, cap) => {
    const embs = clusteredEmbeddings(n, d, speakers, seed);
    const dense = denseAverageLinkage(embs, n, tau, cap, d);
    expect(Array.from(averageLinkage(embs, n, tau, cap, d))).toEqual(Array.from(dense));
    expect(new Set(dense).size).toBeGreaterThan(1);
  });
});
