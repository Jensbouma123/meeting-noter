import type { ChunkBytes } from '../types/download-cache-records';
import type { MetaStore } from '../types/download-cache-store';
import { openCacheDb } from './cache-db';
import { CHUNK_STORE } from './constants';
import { requestOnce } from './idb-request';

function transact(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => void,
): Promise<void> {
  return openCacheDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction(storeName, mode);
        } catch (err) {
          reject(err);
          return;
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error(`Transaction on "${storeName}" failed`));
        tx.onabort = () => reject(tx.error ?? new Error(`Transaction on "${storeName}" aborted`));
        work(tx.objectStore(storeName));
      }),
  );
}

function storableChunk(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : bytes.slice().buffer;
}

export async function getMetaRecord<T>(store: MetaStore, key: string): Promise<T | undefined> {
  const db = await openCacheDb();
  const tx = db.transaction(store, 'readonly');
  const value = await requestOnce<T | undefined>(tx.objectStore(store).get(key));
  return value ?? undefined;
}

export function putMetaRecord(store: MetaStore, key: string, value: unknown): Promise<void> {
  return transact(store, 'readwrite', (s) => {
    s.put(value as never, key);
  });
}

export function deleteMetaRecord(store: MetaStore, key: string): Promise<void> {
  return transact(store, 'readwrite', (s) => {
    s.delete(key);
  });
}

export function putChunk(key: string, index: number, bytes: Uint8Array): Promise<void> {
  return transact(CHUNK_STORE, 'readwrite', (s) => {
    s.put(storableChunk(bytes), [key, index] as IDBValidKey);
  });
}

export async function getChunk(key: string, index: number): Promise<ChunkBytes | null> {
  const db = await openCacheDb();
  const tx = db.transaction(CHUNK_STORE, 'readonly');
  const value = await requestOnce<ArrayBuffer | undefined>(
    tx.objectStore(CHUNK_STORE).get([key, index] as IDBValidKey),
  );
  return value ? new Uint8Array(value) : null;
}

export async function getChunks(key: string, count: number): Promise<ChunkBytes[]> {
  if (count <= 0) return [];
  const db = await openCacheDb();
  const tx = db.transaction(CHUNK_STORE, 'readonly');
  const store = tx.objectStore(CHUNK_STORE);
  const parts = await Promise.all(
    Array.from({ length: count }, (_, index) =>
      requestOnce<ArrayBuffer | undefined>(store.get([key, index] as IDBValidKey)),
    ),
  );
  return parts.map((part) => (part ? new Uint8Array(part) : new Uint8Array(0)));
}

export function deleteChunksFrom(key: string, fromIndex: number): Promise<void> {
  return transact(CHUNK_STORE, 'readwrite', (s) => {
    s.delete(
      IDBKeyRange.bound(
        [key, fromIndex] as IDBValidKey,
        [key, Number.MAX_SAFE_INTEGER] as IDBValidKey,
      ) as unknown as IDBValidKey,
    );
  });
}
