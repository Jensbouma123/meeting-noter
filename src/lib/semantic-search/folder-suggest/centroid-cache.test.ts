import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as codec from '../vector-codec';
import { indexKey, saveIndex } from '../store';
import { centroidKey } from '../centroid-store';
import { cachedCentroid, clearCentroidCache } from './centroid-cache';
import type { KeyValueStore } from '../types';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const vectors = [0, 1, 2].map(() => new Float32Array([1, 0.5, 0]));
const data = { windows: vectors.map((_, i) => ({ meetingId: 'm', index: i, start: i, end: i + 1, text: 't' })), vectors, chapters: [] };

describe('cachedCentroid', () => {
  beforeEach(() => clearCentroidCache());

  it('never decodes vectors after saveIndex wrote the centroid', () => {
    const store = memoryStore();
    saveIndex('m', data, store);
    const decode = vi.spyOn(codec, 'decodeVector');
    const first = cachedCentroid('m', store);
    for (let i = 0; i < 5; i++) expect(cachedCentroid('m', store)).toBe(first);
    expect(first).not.toBeNull();
    expect(decode).not.toHaveBeenCalled();
    decode.mockRestore();
  });

  it('backfills a legacy index once, then stops decoding', () => {
    const store = memoryStore();
    saveIndex('m', data, store);
    const expected = cachedCentroid('m', store);
    store.map.delete(centroidKey('m'));
    clearCentroidCache();
    const decode = vi.spyOn(codec, 'decodeVector');
    expect(Array.from(cachedCentroid('m', store)!)).toEqual(Array.from(expected!));
    const afterBackfill = decode.mock.calls.length;
    expect(afterBackfill).toBe(3);
    cachedCentroid('m', store);
    cachedCentroid('m', store);
    expect(decode.mock.calls.length).toBe(afterBackfill);
    decode.mockRestore();
  });

  it('refreshes when the meeting is re-indexed', () => {
    const store = memoryStore();
    saveIndex('m', data, store);
    const before = cachedCentroid('m', store);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000);
    saveIndex('m', { ...data, vectors: vectors.map(() => new Float32Array([0, 1, 0])) }, store);
    expect(cachedCentroid('m', store)).not.toEqual(before);
    vi.restoreAllMocks();
    expect(store.map.has(indexKey('m'))).toBe(true);
  });
});
