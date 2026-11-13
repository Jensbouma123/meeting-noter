import { describe, expect, it, vi } from 'vitest';
import { createFakeEmbedder } from './fake-embedder';
import { disposeSharedEmbedder, indexMeeting, searchMeetings } from './service';
import { listIndexedMeetingIds, loadIndex, removeIndex } from './store';
import { EMBEDDING_DIM, type KeyValueStore, type TranscriptLine } from './types';

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const lines = (texts: string[]): TranscriptLine[] =>
  texts.map((text, i) => ({ start: i * 30, end: i * 30 + 10, text }));

const BUDGET = lines(Array(6).fill('quarterly budget forecast revenue spending'));
const HOLIDAY = lines(Array(6).fill('summer holiday beach cottage july dunes'));

describe('indexMeeting / searchMeetings', () => {
  const transcripts: Record<string, TranscriptLine[]> = { m1: BUDGET, m2: HOLIDAY };
  const base = () => ({
    embedder: createFakeEmbedder(),
    store: memoryStore(),
    loadLines: (id: string) => transcripts[id] ?? null,
    captureActive: () => false,
  });

  it('disposeSharedEmbedder is safe with no embedder and idempotent', () => {
    disposeSharedEmbedder();
    expect(() => disposeSharedEmbedder()).not.toThrow();
  });

  it('persists windows, vectors and chapters', async () => {
    const deps = base();
    const chapters = await indexMeeting('m1', deps);
    expect(chapters).not.toBeNull();
    const saved = loadIndex('m1', deps.store)!;
    expect(saved.windows).toHaveLength(6);
    expect(saved.vectors[0]).toHaveLength(EMBEDDING_DIM);
    expect(saved.chapters).toEqual(chapters);
    expect(listIndexedMeetingIds(deps.store)).toEqual(['m1']);
  });

  it('keeps vectors within int8 quantisation error', async () => {
    const deps = base();
    const embedded = (await deps.embedder.embed([BUDGET[0].text]))[0];
    await indexMeeting('m1', deps);
    const back = loadIndex('m1', deps.store)!.vectors[0];
    let dot = 0;
    let nb = 0;
    for (let i = 0; i < back.length; i++) {
      dot += embedded[i] * back[i];
      nb += back[i] * back[i];
    }
    expect(dot / Math.sqrt(nb)).toBeGreaterThan(0.99);
  });

  it('searches across all persisted meetings', async () => {
    const deps = base();
    await indexMeeting('m1', deps);
    await indexMeeting('m2', deps);
    const hits = await searchMeetings('beach holiday cottage', 3, deps);
    expect(hits[0].meetingId).toBe('m2');
    const budget = await searchMeetings('budget forecast', 3, deps);
    expect(budget[0].meetingId).toBe('m1');
  });

  it('does not duplicate ids on re-index and can remove', async () => {
    const deps = base();
    await indexMeeting('m1', deps);
    await indexMeeting('m1', deps);
    expect(listIndexedMeetingIds(deps.store)).toEqual(['m1']);
    removeIndex('m1', deps.store);
    expect(loadIndex('m1', deps.store)).toBeNull();
    expect(await searchMeetings('budget', 3, deps)).toEqual([]);
  });

  it('skips while capture is active and never embeds', async () => {
    const deps = { ...base(), captureActive: () => true };
    const spy = vi.spyOn(deps.embedder, 'embed');
    expect(await indexMeeting('m1', deps)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    expect(listIndexedMeetingIds(deps.store)).toEqual([]);
  });

  it('returns null for a meeting without a transcript', async () => {
    expect(await indexMeeting('nope', base())).toBeNull();
  });
});

describe('searchMeetings cache', () => {
  it('reuses the restored index and rebuilds when an index changes', async () => {
    const { resetSearchCache } = await import('./service');
    resetSearchCache();
    const store = memoryStore();
    const embedder = createFakeEmbedder();
    const loadLines = (id: string) => (id === 'm1' ? BUDGET : HOLIDAY);
    await indexMeeting('m1', { embedder, store, loadLines, captureActive: () => false });
    const first = await searchMeetings('budget', 3, { embedder, store });
    expect(first.every((h) => h.meetingId === 'm1')).toBe(true);
    await indexMeeting('m2', { embedder, store, loadLines, captureActive: () => false });
    const second = await searchMeetings('summer holiday', 3, { embedder, store });
    expect(second[0].meetingId).toBe('m2');
    removeIndex('m2', store);
    const third = await searchMeetings('summer holiday', 3, { embedder, store });
    expect(third.every((h) => h.meetingId === 'm1')).toBe(true);
  });
});
