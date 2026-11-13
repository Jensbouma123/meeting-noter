import type { KeyValueStore, PersistedIndex } from './types';
import { decodeVector, encodeVector } from './vector-codec';

const VERSION = 1;
const IDS_KEY = 'mn.semindex.ids.v1';

export function indexKey(meetingId: string): string {
  return `mn.semindex.${meetingId}.v1`;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readIds(store: KeyValueStore): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(IDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveIndex(
  meetingId: string,
  data: Omit<PersistedIndex, 'indexedAt'>,
  store: KeyValueStore | null = defaultStore(),
): boolean {
  if (!store) return false;
  try {
    store.setItem(
      indexKey(meetingId),
      JSON.stringify({
        version: VERSION,
        indexedAt: Date.now(),
        windows: data.windows,
        vectors: data.vectors.map(encodeVector),
        chapters: data.chapters,
      }),
    );
    const ids = readIds(store);
    if (!ids.includes(meetingId)) store.setItem(IDS_KEY, JSON.stringify([...ids, meetingId]));
    return true;
  } catch {
    return false;
  }
}

export function loadIndex(
  meetingId: string,
  store: KeyValueStore | null = defaultStore(),
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
      vectors: (p.vectors as string[]).map(decodeVector),
      chapters: Array.isArray(p.chapters) ? p.chapters : [],
      indexedAt: typeof p.indexedAt === 'number' ? p.indexedAt : 0,
    };
  } catch {
    return null;
  }
}

export function removeIndex(
  meetingId: string,
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.removeItem(indexKey(meetingId));
    store.setItem(IDS_KEY, JSON.stringify(readIds(store).filter((id) => id !== meetingId)));
  } catch {
  }
}

export function listIndexedMeetingIds(store: KeyValueStore | null = defaultStore()): string[] {
  return store ? readIds(store) : [];
}
