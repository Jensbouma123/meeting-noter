import { vi, expect } from 'vitest';
import { downloadHfFileResumable } from './resumable-download';

export const CACHE_DB = 'mn-model-cache-db';
export const CACHE_DB_VERSION = 1;
const CHUNK_STORE = 'chunks';
const FILE_STORE = 'files';
export const PARTIAL_STORE = 'partials';
export const STORES = [CHUNK_STORE, FILE_STORE, PARTIAL_STORE];

export const REPO = 'istupakov/parakeet-tdt-0.6b-v3-onnx';
export const FILES = ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'];

export const cacheKey = (file: string) => `hf-${REPO}-main--${file}`;

export function readCacheVersion(): Promise<number | null> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(null);
  return request.then((dbs) => dbs.find((d) => d.name === CACHE_DB)?.version ?? null);
}

export function databaseExists(name: string): Promise<boolean> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(true);
  return request.then((dbs) => dbs.some((d) => d.name === name));
}

export function withCacheDb<T>(work: (db: IDBDatabase) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(CACHE_DB, CACHE_DB_VERSION);
    open.onupgradeneeded = () => {
      for (const store of STORES) {
        if (!open.result.objectStoreNames.contains(store)) open.result.createObjectStore(store);
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      Promise.resolve()
        .then(() => work(db))
        .then(resolve, reject)
        .finally(() => db.close());
    };
  });
}

export function writeCachedFile(file: string, bytes = 8): Promise<void> {
  return withCacheDb((db) => {
    const key = cacheKey(file);
    const tx = db.transaction([CHUNK_STORE, FILE_STORE], 'readwrite');
    tx.objectStore(CHUNK_STORE).put(new ArrayBuffer(bytes), [key, 0] as IDBValidKey);
    tx.objectStore(FILE_STORE).put({ size: bytes, chunkCount: 1, updatedAt: Date.now() }, key);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}

export function readRecord<T>(store: string, key: string): Promise<T | undefined> {
  return withCacheDb((db) => {
    if (!db.objectStoreNames.contains(store)) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function writePartial(file: string): Promise<void> {
  const content = new Uint8Array(64).map((_, i) => i % 256);
  const HEADERS = { 'content-length': '64', etag: '"test-etag"' };
  let sent = 0;
  const stubFetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/models/')) {
      return new Response(JSON.stringify([{ type: 'file', path: file, size: 64 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: HEADERS });
    return new Response(
      new ReadableStream({
        pull(controller) {
          if (sent >= 32) {
            controller.error(new Error('simulated: connection dropped'));
            return;
          }
          controller.enqueue(content.subarray(0, 32));
          sent = 32;
        },
      }),
      { status: 200, headers: HEADERS },
    );
  });
  vi.stubGlobal('fetch', stubFetch);
  try {
    await expect(downloadHfFileResumable(REPO, file, 'main')).rejects.toThrow();
  } finally {
    vi.unstubAllGlobals();
  }
}
