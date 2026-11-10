import type { Chapter, Window } from './types';

/**
 * Persists one meeting's windows, vectors and chapters in localStorage, next
 * to the transcripts (`mn.session.<id>.v1`, see `meeting/persist.ts`).
 *
 * Vectors are unit length, so each component is stored as one signed byte
 * (`round(x * 127)`): 768 B per window instead of 3 KB. That keeps an hour of
 * meeting near 100 KB against the ~5 MB localStorage quota, at a cosine error
 * under about 0.01.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedIndex {
  windows: Window[];
  vectors: Float32Array[];
  chapters: Chapter[];
  indexedAt: number;
}

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

function encodeVector(v: Float32Array): string {
  let bin = '';
  for (let i = 0; i < v.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
    bin += String.fromCharCode(q & 0xff);
  }
  return btoa(bin);
}

function decodeVector(s: string): Float32Array {
  const bin = atob(s);
  const out = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = ((bin.charCodeAt(i) << 24) >> 24) / 127;
  return out;
}

function readIds(store: KeyValueStore): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(IDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Saves one meeting's index. Returns false when storage is missing or full. Never throws. */
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

/** Loads one meeting's index, or null when absent or unreadable. Never throws. */
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
    // best-effort
  }
}

/** Ids of every meeting with a persisted index. */
export function listIndexedMeetingIds(store: KeyValueStore | null = defaultStore()): string[] {
  return store ? readIds(store) : [];
}
