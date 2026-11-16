import { describe, expect, it } from 'vitest';
import { lengthBatches } from './length-batches';
import { ProbsCollector } from './probs-collector';

describe('ProbsCollector', () => {
  it('quantises clamped probabilities and returns each block', () => {
    const c = new ProbsCollector(2);
    expect(Array.from(c.push([0, 1, 0.5, -0.2]))).toEqual([0, 255, 128, 0]);
    expect(Array.from(c.push([1.7, 0.25]))).toEqual([255, 64]);
    expect(c.frames).toBe(3);
  });

  it('concatenates blocks back to floats and clears', () => {
    const c = new ProbsCollector(1);
    c.push([0.2]);
    c.push([1, 0]);
    const f = c.toFloat32();
    expect(f.length).toBe(3);
    expect(f[0]).toBeCloseTo(51 / 255);
    expect(Array.from(f.subarray(1))).toEqual([1, 0]);
    c.clear();
    expect(c.frames).toBe(0);
    expect(c.toFloat32().length).toBe(0);
  });
});

describe('lengthBatches', () => {
  it('groups indices by equal length and chunks each group to size', () => {
    expect(lengthBatches([5, 3, 5, 5, 3, 7], 2)).toEqual([[0, 2], [3], [1, 4], [5]]);
    expect(lengthBatches([], 8)).toEqual([]);
  });
});
