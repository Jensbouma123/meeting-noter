import type { KeyValueStore, PersistedIndex } from './types';
import { defaultKeyValueStore } from './default-store';
import { removeCentroid, storeCentroid } from './centroid-store';
import { encodeRecord } from './encode-record';
import type { EncodedIndex } from './encoded-index.types';
import { decodeVector } from './vector-codec';

const VERSION = 1;
const IDS_KEY = 'mn.semindex.ids.v1';

export function indexKey(meetingId: string): string {
  return `mn.semindex.${meetingId}.v1`;
}

function readIds(store: KeyValueStore): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(IDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

let indexVersion = 0;

export function invalidateIndexCache(): void {
  indexVersion++;
}

export function currentIndexVersion(): number {
  return indexVersion;
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('storage', (e) => {
    if (e.key === null || e.key.startsWith('mn.semindex.')) indexVersion++;
  });
}

export function saveIndex(
  meetingId: string,
  data: Omit<PersistedIndex, 'indexedAt'>,
  store: KeyValueStore | null = defaultKeyValueStore(),
): boolean {
  return saveEncodedIndex(meetingId, encodeRecord(data.windows, data.vectors, data.chapters), store);
}

export function saveEncodedIndex(
  meetingId: string,
  record: EncodedIndex,
  store: KeyValueStore | null = defaultKeyValueStore(),
): boolean {
  if (!store) return false;
  try {
    const indexedAt = Date.now();
    indexVersion++;
    store.setItem(
      indexKey(meetingId),
      JSON.stringify({
        version: VERSION,
        indexedAt,
        windows: record.windows,
        vectors: record.vectors,
        chapters: record.chapters,
      }),
    );
    storeCentroid(meetingId, indexedAt, record.centroid, store);
    const ids = readIds(store);
    if (!ids.includes(meetingId)) store.setItem(IDS_KEY, JSON.stringify([...ids, meetingId]));
    return true;
  } catch {
    return false;
  }
}

export function loadIndex(
  meetingId: string,
  store: KeyValueStore | null = defaultKeyValueStore(),
  decode: (s: string) => Float32Array = decodeVector,
): PersistedIndex | null {
  if (!store) return null;
  try {
    const raw = store.getItem(indexKey(meetingId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || p.version !== VERSION || !Array.isArray(p.windows) || !Array.isArray(p.vectors)) {
      return null;
    }
    if (p.windows.length !== p.vectors.length) return null;
    return {
      windows: p.windows,
      vectors: (p.vectors as string[]).map(decode),
      chapters: Array.isArray(p.chapters) ? p.chapters : [],
      indexedAt: typeof p.indexedAt === 'number' ? p.indexedAt : 0,
    };
  } catch {
    return null;
  }
}

export function removeIndex(meetingId: string, store: KeyValueStore | null = defaultKeyValueStore()): void {
  if (!store) return;
  indexVersion++;
  try {
    store.removeItem(indexKey(meetingId));
    removeCentroid(meetingId, store);
    store.setItem(IDS_KEY, JSON.stringify(readIds(store).filter((id) => id !== meetingId)));
  } catch {}
}

export function listIndexedMeetingIds(store: KeyValueStore | null = defaultKeyValueStore()): string[] {
  return store ? readIds(store) : [];
}
