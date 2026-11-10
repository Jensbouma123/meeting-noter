import { describe, expect, it } from 'vitest';
import { SampleRing } from './ring-buffer';

/** The naive window the worker used to keep: append, then keep the tail. */
function naiveWindow(frames: Float32Array[], capacity: number): Float32Array {
  const all = new Float32Array(frames.reduce((n, f) => n + f.length, 0));
  let offset = 0;
  for (const f of frames) {
    all.set(f, offset);
    offset += f.length;
  }
  return all.length > capacity ? all.subarray(all.length - capacity) : all;
}

describe('SampleRing', () => {
  it('matches the append-and-trim window once pushes exceed its capacity', () => {
    const capacity = 1000;
    const ring = new SampleRing(capacity);
    const frames: Float32Array[] = [];
    let next = 0;
    // Uneven frame sizes, including one longer than the whole window.
    for (const size of [160, 300, 999, 1, 1600, 250, 77, 480, 333]) {
      const frame = new Float32Array(size);
      for (let i = 0; i < size; i += 1) frame[i] = next++;
      frames.push(frame);
      ring.push(frame);
      expect(Array.from(ring.toArray())).toEqual(Array.from(naiveWindow(frames, capacity)));
    }
    expect(ring.length).toBe(capacity);
  });

  it('returns only what was pushed before it fills', () => {
    const ring = new SampleRing(10);
    ring.push(new Float32Array([1, 2, 3]));
    expect(Array.from(ring.toArray())).toEqual([1, 2, 3]);
    expect(ring.length).toBe(3);
  });
});
