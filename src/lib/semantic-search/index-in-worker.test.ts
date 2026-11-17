import { describe, expect, it, vi } from 'vitest';
import { indexMeeting } from './service';
import { loadIndex } from './store';
import type { EmbedWorkerIn, EmbedWorkerLike, EmbedWorkerOut, KeyValueStore } from './types';
import { createWorkerEmbedder } from './worker-embedder';

const spies = vi.hoisted(() => ({ chunk: vi.fn(), encode: vi.fn() }));

vi.mock('./chunk', async (orig) => {
  const mod = await orig<typeof import('./chunk')>();
  return {
    chunkTranscript: (...a: Parameters<typeof mod.chunkTranscript>) => (spies.chunk(), mod.chunkTranscript(...a)),
  };
});

vi.mock('./vector-codec', async (orig) => {
  const mod = await orig<typeof import('./vector-codec')>();
  return { ...mod, encodeVector: (v: Float32Array) => (spies.encode(), mod.encodeVector(v)) };
});

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('indexMeeting with the worker embedder', () => {
  it('posts the transcript to the worker and only stores the encoded record', async () => {
    const posted: EmbedWorkerIn[] = [];
    const window = { meetingId: 'm1', index: 0, start: 0, end: 10, text: 'hello' };
    const chapter = {
      meetingId: 'm1',
      index: 0,
      start: 0,
      end: 10,
      windowStart: 0,
      windowEnd: 1,
      title: 'hello',
      terms: ['hello'],
    };
    const spawn = (): EmbedWorkerLike => {
      const w: EmbedWorkerLike = {
        onmessage: null,
        onerror: null,
        terminate() {},
        postMessage(msg) {
          posted.push(msg);
          const out: EmbedWorkerOut = {
            id: msg.id,
            record: { windows: [window], vectors: ['fw=='], chapters: [chapter], centroid: null },
          };
          queueMicrotask(() => w.onmessage?.({ data: out }));
        },
      };
      return w;
    };
    const store = memoryStore();
    const lines = [{ start: 0, end: 10, text: 'hello' }];
    const chapters = await indexMeeting('m1', {
      embedder: createWorkerEmbedder(spawn),
      store,
      loadLines: () => lines,
      captureActive: () => false,
    });
    expect(posted).toEqual([{ id: 0, kind: 'index', meetingId: 'm1', lines }]);
    expect(spies.chunk).not.toHaveBeenCalled();
    expect(spies.encode).not.toHaveBeenCalled();
    expect(chapters).toEqual([chapter]);
    expect(loadIndex('m1', store)!.vectors[0][0]).toBe(1);
  });
});
