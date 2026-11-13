import { describe, expect, it } from 'vitest';
import { backfillIndex } from './backfill';
import { createFakeEmbedder } from './fake-embedder';
import { resetSearchCache } from './service';
import { listIndexedMeetingIds, saveIndex } from './store';
import type { KeyValueStore, TranscriptLine } from './types';

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const lines = (word: string): TranscriptLine[] =>
  Array.from({ length: 6 }, (_, i) => ({ start: i * 30, end: i * 30 + 10, text: `${word} topic ${word}` }));

const transcripts: Record<string, TranscriptLine[]> = {
  a: lines('budget'),
  b: lines('holiday'),
  c: lines('roadmap'),
};

const base = () => ({
  embedder: createFakeEmbedder(),
  store: memoryStore(),
  loadLines: (id: string) => transcripts[id] ?? null,
  captureActive: () => false,
  listMeetingIds: () => ['a', 'b', 'c'],
  pause: async () => {},
});

describe('backfillIndex', () => {
  it('indexes missing meetings and skips already indexed ones', async () => {
    resetSearchCache();
    const deps = base();
    saveIndex('a', { windows: [], vectors: [], chapters: [] }, deps.store);
    const result = await backfillIndex(deps);
    expect(result).toEqual({ total: 2, done: 2, failed: 0, aborted: false });
    expect(listIndexedMeetingIds(deps.store).sort()).toEqual(['a', 'b', 'c']);
  });

  it('does nothing when everything is indexed', async () => {
    const deps = base();
    await backfillIndex(deps);
    expect(await backfillIndex(deps)).toEqual({ total: 0, done: 0, failed: 0, aborted: false });
  });

  it('aborts when capture becomes active', async () => {
    const deps = base();
    let calls = 0;
    const result = await backfillIndex({ ...deps, captureActive: () => ++calls > 3 });
    expect(result.aborted).toBe(true);
    expect(result.done).toBeLessThan(3);
    expect(listIndexedMeetingIds(deps.store).length).toBeLessThan(3);
  });

  it('keeps going when one meeting fails', async () => {
    const deps = base();
    const result = await backfillIndex({
      ...deps,
      loadLines: (id) => {
        if (id === 'a') throw new Error('boom');
        return transcripts[id] ?? null;
      },
    });
    expect(result).toEqual({ total: 3, done: 3, failed: 1, aborted: false });
    expect(listIndexedMeetingIds(deps.store).sort()).toEqual(['b', 'c']);
  });

  it('skips attempted ids and honours the abort signal', async () => {
    const deps = base();
    const attempted = new Set(['a']);
    const result = await backfillIndex({ ...deps, attempted });
    expect(result.total).toBe(2);
    expect(attempted.has('c')).toBe(true);
    const stopped = await backfillIndex({ ...base(), signal: { aborted: true } });
    expect(stopped).toMatchObject({ aborted: true, done: 0 });
  });

  it('reports progress', async () => {
    const seen: number[] = [];
    await backfillIndex({ ...base(), onProgress: (p) => seen.push(p.done) });
    expect(seen).toEqual([0, 1, 2, 3]);
  });
});
