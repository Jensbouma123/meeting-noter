/**
 * Session intelligence (D1 triage, decisions, action items): one record per
 * session, in IndexedDB `mn-intelligence-db`.
 *
 * Never `localStorage`: these records grow with the meeting and would crowd
 * the autosave slot. With no `indexedDB` (SSR, some private modes, a failed
 * open) records live in memory for the page's life instead, so the UI still
 * works and nothing is written anywhere else.
 *
 * Writes go through one queue per session, so two analyses finishing at once
 * cannot lose each other's updates.
 */
import { useSyncExternalStore } from 'react';
import type { SessionIntelligence } from '@/lib/meeting/types';

const DB_NAME = 'mn-intelligence-db';
const DB_VERSION = 1;
const STORE = 'sessions';

interface Backend {
  get(sessionId: string): Promise<SessionIntelligence | undefined>;
  put(record: SessionIntelligence): Promise<void>;
  remove(sessionId: string): Promise<void>;
  close(): void;
}

/** Stable key for `SessionIntelligence.triageBySegment`. */
export function triageKey(segmentId: string, textHash: string): string {
  return `${segmentId}:${textHash}`;
}

/** Short, deterministic, synchronous hash (cyrb53, base36). Equal text gives
 *  equal hashes, so a segment that changed text gets a new triage key. */
export function hashSegmentText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function emptyIntelligence(sessionId: string): SessionIntelligence {
  return {
    sessionId,
    status: 'idle',
    progress: { done: 0, total: 0 },
    triageBySegment: {},
    decisions: [],
    actionItems: [],
    error: null,
    updatedAt: 0,
  };
}

function openIndexedDb(): Promise<Backend> {
  return new Promise<Backend>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'sessionId' });
      }
    };
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
    request.onsuccess = () => {
      const db = request.result;
      const run = <T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) =>
        new Promise<T>((res, rej) => {
          const tx = db.transaction(STORE, mode);
          const req = op(tx.objectStore(STORE));
          tx.oncomplete = () => res(req.result);
          tx.onerror = () => rej(tx.error ?? new Error('indexedDB transaction failed'));
          tx.onabort = () => rej(tx.error ?? new Error('indexedDB transaction aborted'));
        });
      resolve({
        get: (sessionId) =>
          run<SessionIntelligence | undefined>('readonly', (s) => s.get(sessionId)),
        put: async (record) => {
          await run('readwrite', (s) => s.put(record));
        },
        remove: async (sessionId) => {
          await run('readwrite', (s) => s.delete(sessionId));
        },
        close: () => db.close(),
      });
    };
  });
}

function memoryBackend(): Backend {
  const records = new Map<string, SessionIntelligence>();
  return {
    get: async (sessionId) => records.get(sessionId),
    put: async (record) => {
      records.set(record.sessionId, record);
    },
    remove: async (sessionId) => {
      records.delete(sessionId);
    },
    close: () => {},
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

let backendPromise: Promise<Backend> | null = null;
let backendInstance: Backend | null = null;

function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    const usable = typeof indexedDB !== 'undefined' && indexedDB !== null;
    backendPromise = (usable ? withTimeout(openIndexedDb(), 4000, 'indexedDB open timed out') : Promise.reject(new Error('no indexedDB')))
      .catch(() => memoryBackend())
      .then((b) => {
        backendInstance = b;
        return b;
      });
  }
  return backendPromise;
}

/* In-memory view for `useSyncExternalStore`: synchronous reads, notified on
 * every write. Filled lazily from the backend on first subscribe. */

const cache = new Map<string, SessionIntelligence>();
const emptyCache = new Map<string, SessionIntelligence>();
const listeners = new Map<string, Set<() => void>>();
const loading = new Map<string, Promise<void>>();
const writeQueues = new Map<string, Promise<unknown>>();

function notify(sessionId: string): void {
  for (const listener of listeners.get(sessionId) ?? []) listener();
}

function emptyFor(sessionId: string): SessionIntelligence {
  let empty = emptyCache.get(sessionId);
  if (!empty) {
    empty = emptyIntelligence(sessionId);
    emptyCache.set(sessionId, empty);
  }
  return empty;
}

/** Load a session's record into the view, once. */
function ensureLoaded(sessionId: string): Promise<void> {
  if (cache.has(sessionId)) return Promise.resolve();
  let pending = loading.get(sessionId);
  if (!pending) {
    pending = getBackend()
      .then((b) => b.get(sessionId))
      .then((record) => {
        if (record && !cache.has(sessionId)) {
          cache.set(sessionId, record);
          notify(sessionId);
        }
      })
      .catch(() => {
        // Unreadable record: the view keeps its empty default.
      })
      .finally(() => loading.delete(sessionId));
    loading.set(sessionId, pending);
  }
  return pending;
}

/** Read a session's intelligence from the store. Resolves to an empty record
 *  when nothing was saved for it. */
export async function getSessionIntelligence(sessionId: string): Promise<SessionIntelligence> {
  const backend = await getBackend();
  return (await backend.get(sessionId)) ?? emptyIntelligence(sessionId);
}

/**
 * Read-modify-write one session's record. `update` gets the stored record (or
 * an empty one) and returns the next one; `updatedAt` is stamped here.
 * Writes for one session run in order.
 */
export function updateSessionIntelligence(
  sessionId: string,
  update: (current: SessionIntelligence) => SessionIntelligence,
): Promise<SessionIntelligence> {
  const previous = writeQueues.get(sessionId) ?? Promise.resolve();
  const next = previous
    .catch(() => {
      // A failed earlier write must not block this one.
    })
    .then(async () => {
      const backend = await getBackend();
      const current = (await backend.get(sessionId)) ?? emptyIntelligence(sessionId);
      const record: SessionIntelligence = {
        ...update(current),
        sessionId,
        updatedAt: Date.now(),
      };
      await backend.put(record);
      cache.set(sessionId, record);
      notify(sessionId);
      return record;
    });
  writeQueues.set(sessionId, next);
  return next;
}

/**
 * Reset a session's run state to `idle` right now: the in-memory view (what the
 * UI reads) changes synchronously and listeners fire before this returns. The
 * persisted copy is written best-effort, bypassing the per-session write queue,
 * so a hung earlier write can never keep the UI stuck on "running".
 */
export function resetIntelligenceRunState(sessionId: string): void {
  const current = cache.get(sessionId) ?? emptyIntelligence(sessionId);
  const record: SessionIntelligence = {
    ...current,
    status: 'idle',
    error: null,
    progress: { done: 0, total: 0 },
    updatedAt: Date.now(),
  };
  cache.set(sessionId, record);
  notify(sessionId);
  void withTimeout(getBackend().then((b) => b.put(record)), 4000, 'reset write timed out').catch(() => {
    // The view is already reset; a stale persisted `running` is healed on next mount.
  });
}

/** Remove a session's intelligence entirely. */
export async function clearSessionIntelligence(sessionId: string): Promise<void> {
  await (writeQueues.get(sessionId) ?? Promise.resolve()).catch(() => {});
  const backend = await getBackend();
  await backend.remove(sessionId);
  cache.delete(sessionId);
  notify(sessionId);
}

/**
 * Listen for changes to one session's intelligence. The first listener also
 * loads the stored record. Returns the unsubscribe function.
 */
export function subscribeIntelligence(sessionId: string, listener: () => void): () => void {
  let set = listeners.get(sessionId);
  if (!set) {
    set = new Set();
    listeners.set(sessionId, set);
  }
  set.add(listener);
  void ensureLoaded(sessionId);
  return () => {
    const current = listeners.get(sessionId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(sessionId);
  };
}

/** Current in-memory intelligence for a session (an empty record until loaded). */
export function getIntelligenceSnapshot(sessionId: string): SessionIntelligence {
  return cache.get(sessionId) ?? emptyFor(sessionId);
}

/** React hook: the session's intelligence, re-rendering on every change. */
export function useSessionIntelligence(sessionId: string): SessionIntelligence {
  return useSyncExternalStore(
    (onChange) => subscribeIntelligence(sessionId, onChange),
    () => getIntelligenceSnapshot(sessionId),
    () => emptyFor(sessionId),
  );
}

/** Test hook: drop the connection and all in-memory state. Does not delete
 *  the database; tests do that themselves. */
export function __resetIntelligenceStoreForTests(): void {
  backendInstance?.close();
  backendInstance = null;
  backendPromise = null;
  cache.clear();
  emptyCache.clear();
  listeners.clear();
  loading.clear();
  writeQueues.clear();
}
