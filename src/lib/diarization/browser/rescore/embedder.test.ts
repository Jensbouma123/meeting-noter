import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  shapes: [] as number[][],
  created: 0,
  released: 0,
}));

vi.mock('../onnx-session', () => {
  class Tensor {
    constructor(public type: string, public data: Float32Array, public dims: number[]) {}
  }
  const session = {
    inputNames: ['feats'],
    outputNames: ['embs'],
    run: async (feeds: Record<string, Tensor>) => {
      const { data, dims } = feeds.feats;
      state.shapes.push(dims);
      const [n, t] = dims;
      const out = new Float32Array(n * 256);
      for (let r = 0; r < n; r += 1) out.fill(data[r * t * 80], r * 256, (r + 1) * 256);
      return { embs: { data: out } };
    },
    release: async () => {
      state.released += 1;
    },
  };
  return {
    Tensor,
    createSession: async () => {
      state.created += 1;
      return { session, backend: 'wasm' };
    },
  };
});

import { SpeakerEmbedder } from './embedder';

const feat = (frames: number, value: number): Float32Array => new Float32Array(frames * 80).fill(value);

beforeEach(() => {
  state.shapes = [];
  state.created = 0;
  state.released = 0;
});

describe('SpeakerEmbedder', () => {
  it('loads lazily once, batches by length and returns rows in input order', async () => {
    const load = vi.fn(async () => new Uint8Array(1));
    const e = new SpeakerEmbedder(load);
    expect(load).not.toHaveBeenCalled();
    const frames = [4, 6, 4, 4, 4, 4, 4, 4, 4, 4];
    const out = await e.embed(frames.map((f, i) => feat(f, i + 1)), frames);
    expect(state.shapes).toEqual([[8, 4, 80], [1, 4, 80], [1, 6, 80]]);
    expect(out.length).toBe(10 * 256);
    for (let i = 0; i < 10; i += 1) expect(out[i * 256 + 255]).toBe(i + 1);
    await e.embed([feat(2, 1)], [2]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(state.created).toBe(1);
  });

  it('releases the session on dispose and reloads afterwards', async () => {
    const e = new SpeakerEmbedder(async () => 'model.onnx');
    expect((await e.embed([], [])).length).toBe(0);
    await e.dispose();
    expect(state.released).toBe(0);
    await e.embed([feat(1, 1)], [1]);
    await e.dispose();
    expect(state.released).toBe(1);
    await e.embed([feat(1, 1)], [1]);
    expect(state.created).toBe(2);
  });
});
