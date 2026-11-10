import { describe, expect, it, vi } from 'vitest';
import { createEg2Embedder, DOCUMENT_PREFIX, QUERY_PREFIX } from './eg2-embedder';
import { createFakeEmbedder } from './fake-embedder';
import { indexMeeting, searchMeetings } from './service';
import { listIndexedMeetingIds, loadIndex, removeIndex, type KeyValueStore } from './store';
import { createEmbedHandler, type EmbedWorkerIn, type EmbedWorkerOut } from './worker';
import { createWorkerEmbedder, type EmbedWorkerLike } from './worker-embedder';
import { EMBEDDING_DIM, type TranscriptLine } from './types';

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

describe('indexMeeting / searchMeetings', () => {
  const transcripts: Record<string, TranscriptLine[]> = { m1: BUDGET, m2: HOLIDAY };
  const base = () => ({
    embedder: createFakeEmbedder(),
    store: memoryStore(),
    loadLines: (id: string) => transcripts[id] ?? null,
    captureActive: () => false,
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
