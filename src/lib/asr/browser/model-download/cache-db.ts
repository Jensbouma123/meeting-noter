import type { DeleteModelCacheResult } from '../types/download-cache-state';
import { CACHE_DB_NAME, CACHE_DB_STORES, CACHE_DB_VERSION, LEGACY_DB_NAMES } from './constants';
import { closeQuietly, deleteDatabaseWithinDeadline } from './database-delete';
import { dropLegacyDatabases } from './legacy-sweep';

let cacheDbPromise: Promise<IDBDatabase> | null = null;
let cacheDbRef: IDBDatabase | null = null;

function openDatabase(name: string, version: number, stores: readonly string[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(name, version);
    } catch (err) {
      reject(err);
      return;
    }
    request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB "${name}"`));
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => closeQuietly(db);
      resolve(db);
    };
  });
}

export function openCacheDb(): Promise<IDBDatabase> {
  if (!cacheDbPromise) {
    cacheDbPromise = openDatabase(CACHE_DB_NAME, CACHE_DB_VERSION, CACHE_DB_STORES)
      .then((db) => {
        cacheDbRef = db;
        dropLegacyDatabases(db);
        return db;
      })
      .catch((err) => {
        cacheDbPromise = null;
        cacheDbRef = null;
        throw err;
      });
  }
  return cacheDbPromise;
}

export function closeModelCacheConnections(): void {
  closeQuietly(cacheDbRef);
  cacheDbRef = null;
  cacheDbPromise = null;
}

export async function deleteModelCache(): Promise<DeleteModelCacheResult> {
  closeModelCacheConnections();
  const outcomes = await Promise.all([
    deleteDatabaseWithinDeadline(CACHE_DB_NAME),
    ...LEGACY_DB_NAMES.map((name) => deleteDatabaseWithinDeadline(name)),
  ]);
  return { deleted: outcomes.every((outcome) => outcome === 'deleted') };
}
