import { describe, expect, it } from 'vitest';
import { createFakeEmbedder } from './fake-embedder';
import { SemanticIndex } from './index';
import { indexMeeting, searchMeetings } from './service';
import { loadIndex, saveIndex } from './store';
import type { KeyValueStore, TranscriptLine } from './types';

function countingStore(): KeyValueStore & { reads: string[] } {
  const m = new Map<string, string>();
  const reads: string[] = [];
  return {
    reads,
    getItem: (k) => (reads.push(k), m.get(k) ?? null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const lines = (text: string): TranscriptLine[] =>
  Array.from({ length: 6 }, (_, i) => ({ start: i * 30, end: i * 30 + 10, text }));

describe('search cache', () => {
  it('reads no index strings on repeated searches until saveIndex', async () => {
    const store = countingStore();
    const embedder = createFakeEmbedder();
    const loadLines = (id: string) => lines(id === 'm1' ? 'budget forecast revenue' : 'beach holiday cottage');
    await indexMeeting('m1', { embedder, store, loadLines, captureActive: () => false });
    await indexMeeting('m2', { embedder, store, loadLines, captureActive: () => false });
    const first = await searchMeetings('beach holiday', 3, { embedder, store });
    expect(first[0].meetingId).toBe('m2');
    store.reads.length = 0;
    for (let i = 0; i < 3; i++) await searchMeetings('budget', 3, { embedder, store });
    expect(store.reads).toEqual([]);
    saveIndex('m1', loadIndex('m1', store)!, store);
    store.reads.length = 0;
    await searchMeetings('budget', 3, { embedder, store });
    expect(store.reads).toContain('mn.semindex.m1.v1');
  });

  it('restores vectors as given, without normalizing', () => {
    const index = new SemanticIndex(createFakeEmbedder());
    const v = new Float32Array([2, 0]);
    index.restoreMeeting('m', [{ meetingId: 'm', index: 0, start: 0, end: 1, text: 'x' }], [v]);
    expect(index.exportMeeting('m')!.vectors[0]).toBe(v);
  });
});
