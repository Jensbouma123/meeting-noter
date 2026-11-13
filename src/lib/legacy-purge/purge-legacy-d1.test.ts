// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openCacheDb } from '@/lib/asr/browser/model-download/cache-db';
import { CHUNK_STORE, FILE_STORE, PARTIAL_STORE } from '@/lib/asr/browser/model-download/constants';
import { cacheKey } from '@/lib/asr/browser/model-download/cached-files';
import { D1_INTELLIGENCE_DB_NAME, D1_PURGE_DONE_KEY } from './constants';
import { purgeLegacyD1Storage } from './purge-legacy-d1';

const D1_KEY = cacheKey('onnx-community/d1-omni-600M-ONNX', 'main', 'onnx/model_quantized.onnx_data');
const PARAKEET_KEY = cacheKey('istupakov/parakeet-tdt-0.6b-v3-onnx', 'main', 'vocab.txt');

async function seed(key: string): Promise<void> {
  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([CHUNK_STORE, FILE_STORE, PARTIAL_STORE], 'readwrite');
    tx.objectStore(CHUNK_STORE).put(new ArrayBuffer(4), [key, 0] as IDBValidKey);
    tx.objectStore(CHUNK_STORE).put(new ArrayBuffer(4), [key, 1] as IDBValidKey);
    tx.objectStore(FILE_STORE).put({ size: 8, chunkCount: 2 }, key);
    tx.objectStore(PARTIAL_STORE).put({ size: 4 }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function count(store: string, key: string): Promise<number> {
  const db = await openCacheDb();
  return new Promise((resolve, reject) => {
    const objectStore = db.transaction(store, 'readonly').objectStore(store);
    const request =
      store === CHUNK_STORE
        ? objectStore.count(IDBKeyRange.bound([key, 0], [key, 99]))
        : objectStore.count(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function createIntelligenceDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(D1_INTELLIGENCE_DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('sessions', { keyPath: 'sessionId' });
    open.onsuccess = () => {
      open.result.close();
      resolve();
    };
    open.onerror = () => reject(open.error);
  });
}

async function intelligenceDbExists(): Promise<boolean> {
  const dbs = await indexedDB.databases();
  return dbs.some((d) => d.name === D1_INTELLIGENCE_DB_NAME);
}

describe('purgeLegacyD1Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes only D1 model records and the D1 intelligence database', async () => {
    await seed(D1_KEY);
    await seed(PARAKEET_KEY);
    await createIntelligenceDb();

    await purgeLegacyD1Storage();

    for (const store of [CHUNK_STORE, FILE_STORE, PARTIAL_STORE]) {
      expect(await count(store, D1_KEY)).toBe(0);
      expect(await count(store, PARAKEET_KEY)).toBeGreaterThan(0);
    }
    expect(await intelligenceDbExists()).toBe(false);
    expect(localStorage.getItem(D1_PURGE_DONE_KEY)).toBe('1');
  });

  it('is a no-op once done', async () => {
    await purgeLegacyD1Storage();
    await seed(D1_KEY);

    await purgeLegacyD1Storage();

    expect(await count(FILE_STORE, D1_KEY)).toBe(1);
  });

  it('succeeds again on empty storage', async () => {
    await purgeLegacyD1Storage();
    localStorage.clear();
    await expect(purgeLegacyD1Storage()).resolves.toBeUndefined();
  });
});
