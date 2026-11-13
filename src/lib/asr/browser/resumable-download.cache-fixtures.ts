import 'fake-indexeddb/auto';
import { afterEach, beforeEach, vi } from 'vitest';
import { deleteModelCache } from './resumable-download';

export const DB_NAME = 'mn-model-cache-db';
export const CHUNK_STORE = 'chunks';
export const FILE_STORE = 'files';
export const PARTIAL_STORE = 'partials';

export const putRecorder: { values: unknown[]; spy: ReturnType<typeof vi.spyOn> | null } = {
  values: [],
  spy: null,
};

const realPut = IDBObjectStore.prototype.put;

export function refuseByteWrites(message: string): void {
  putRecorder.spy?.mockImplementation(function (this: IDBObjectStore, ...args: unknown[]) {
    if (args[0] instanceof ArrayBuffer) throw new DOMException(message, 'UnknownError');
    return Reflect.apply(realPut, this, args as never);
  });
}

export function containsBlob(value: unknown, depth = 0, seen = new Set<unknown>()): boolean {
  if (value == null) return false;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  if (depth > 4 || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return false;
  if (Array.isArray(value)) return value.some((item) => containsBlob(item, depth + 1, seen));
  return Object.values(value as Record<string, unknown>).some((item) =>
    containsBlob(item, depth + 1, seen),
  );
}


export function withDb<T>(work: (db: IDBDatabase) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME);
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

export function readStore<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return withDb((db) => {
    if (!db.objectStoreNames.contains(store)) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export function readAllKeys(store: string): Promise<string[]> {
  return withDb((db) => {
    if (!db.objectStoreNames.contains(store)) return [];
    return new Promise<string[]>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).getAllKeys();
      request.onsuccess = () => resolve(request.result.map(String).sort());
      request.onerror = () => reject(request.error);
    });
  });
}

export function databaseExists(name: string): Promise<boolean> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(true);
  return request.then((dbs) => dbs.some((d) => d.name === name));
}


export function installCacheHooks(): void {
  beforeEach(async () => {
    await deleteModelCache();
    putRecorder.values = [];
    putRecorder.spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      ...args: unknown[]
    ) {
      putRecorder.values.push(args[0]);
      return Reflect.apply(realPut, this, args as never);
    });
  });

  afterEach(() => {
    putRecorder.spy?.mockRestore();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}
