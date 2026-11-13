import { describe, expect, it } from 'vitest';
import { createFakeEmbedder } from './fake-embedder';
import { bestPerMeeting, searchLibrary } from './library-search';
import { indexMeeting, resetSearchCache } from './service';
import type { Hit, KeyValueStore, TranscriptLine } from './types';

const hit = (meetingId: string, index: number, score: number): Hit => ({
  meetingId,
  score,
  window: { meetingId, index, start: index * 30, end: index * 30 + 30, text: 't' },
});

describe('bestPerMeeting', () => {
  it('keeps the best window per meeting above the minimum score, capped and sorted', () => {
    const hits = [hit('a', 0, 0.5), hit('a', 1, 0.8), hit('b', 0, 0.34), hit('c', 2, 0.6), hit('d', 0, 0.4)];
    const out = bestPerMeeting(hits, 0.35, 2);
    expect(out.map((h) => [h.meetingId, h.window.index])).toEqual([['a', 1], ['c', 2]]);
  });
});

describe('searchLibrary', () => {
  it('finds the matching meeting across the library', async () => {
    resetSearchCache();
    const m = new Map<string, string>();
    const store: KeyValueStore = {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, v),
      removeItem: (k) => void m.delete(k),
    };
    const embedder = createFakeEmbedder();
    const texts: Record<string, string> = {
      m1: 'quarterly budget forecast revenue spending',
      m2: 'summer holiday beach cottage july dunes',
    };
    const loadLines = (id: string): TranscriptLine[] =>
      Array.from({ length: 6 }, (_, i) => ({ start: i * 30, end: i * 30 + 10, text: texts[id] }));
    for (const id of ['m1', 'm2']) await indexMeeting(id, { embedder, store, loadLines, captureActive: () => false });
    const hits = await searchLibrary('quarterly budget forecast', 8, { embedder, store });
    expect(hits[0].meetingId).toBe('m1');
    expect(new Set(hits.map((h) => h.meetingId)).size).toBe(hits.length);
  });
});
