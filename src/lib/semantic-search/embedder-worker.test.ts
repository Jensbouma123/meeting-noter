import { describe, expect, it, vi } from 'vitest';
import { DOCUMENT_PREFIX, QUERY_PREFIX, createEg2Embedder } from './eg2-embedder';
import { EMBEDDING_DIM, type EmbedWorkerIn, type EmbedWorkerLike, type EmbedWorkerOut } from './types';
import { createEmbedHandler } from './worker';
import { createWorkerEmbedder } from './worker-embedder';

describe('createEg2Embedder', () => {
  it('prefixes by role and reports the EG2 dimension', async () => {
    const embedText = vi.fn(async (t: string[]) => t.map(() => new Float32Array(EMBEDDING_DIM)));
    const e = createEg2Embedder({ embedText });
    expect(e.dim).toBe(EMBEDDING_DIM);
    await e.embed(['a'], 'query');
    await e.embed(['b']);
    expect(embedText).toHaveBeenNthCalledWith(1, ['a'], { prefix: QUERY_PREFIX });
    expect(embedText).toHaveBeenNthCalledWith(2, ['b'], { prefix: DOCUMENT_PREFIX });
  });
});

describe('embed worker', () => {
  it('loads the model lazily, on the first request only', async () => {
    const embedText = vi.fn(async (t: string[]) => t.map(() => new Float32Array(EMBEDDING_DIM)));
    const make = vi.fn(() => ({ embedText }));
    const handle = createEmbedHandler(make);
    expect(make).not.toHaveBeenCalled();
    await handle({ id: 1, texts: ['x'], role: 'document' });
    await handle({ id: 2, texts: ['y'], role: 'query' });
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('reports model errors by id', async () => {
    const handle = createEmbedHandler(() => ({
      embedText: async () => {
        throw new Error('boom');
      },
    }));
    expect(await handle({ id: 7, texts: ['x'], role: 'document' })).toEqual({
      id: 7,
      error: 'boom',
    });
  });

  it('client spawns the worker on first embed and routes replies', async () => {
    const posted: EmbedWorkerIn[] = [];
    const spawn = vi.fn((): EmbedWorkerLike => {
      const w: EmbedWorkerLike = {
        onmessage: null,
        onerror: null,
        terminate: vi.fn(),
        postMessage(msg) {
          posted.push(msg);
          const out: EmbedWorkerOut = { id: msg.id, vectors: [new Float32Array([1, 0])] };
          queueMicrotask(() => w.onmessage?.({ data: out }));
        },
      };
      return w;
    });
    const e = createWorkerEmbedder(spawn);
    expect(spawn).not.toHaveBeenCalled();
    const [v] = await e.embed(['hi'], 'query');
    expect(Array.from(v)).toEqual([1, 0]);
    expect(posted[0]).toMatchObject({ texts: ['hi'], role: 'query' });
    await e.embed(['again']);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('client rejects pending calls when the worker crashes', async () => {
    let w!: EmbedWorkerLike;
    const e = createWorkerEmbedder(
      () => (w = { onmessage: null, onerror: null, terminate() {}, postMessage() {} }),
    );
    const p = e.embed(['x']);
    w.onerror?.({ message: 'died' });
    await expect(p).rejects.toThrow('died');
  });
});
