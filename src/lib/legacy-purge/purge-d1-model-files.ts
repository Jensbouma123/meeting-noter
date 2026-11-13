import { openCacheDb } from '@/lib/asr/browser/model-download/cache-db';
import { CHUNK_STORE, FILE_STORE, PARTIAL_STORE } from '@/lib/asr/browser/model-download/constants';
import { D1_MODEL_KEY_PREFIX } from './constants';

export async function purgeD1ModelFiles(): Promise<void> {
  const db = await openCacheDb();
  const stringKeys = IDBKeyRange.bound(D1_MODEL_KEY_PREFIX, `${D1_MODEL_KEY_PREFIX}￿`);
  const chunkKeys = IDBKeyRange.bound([D1_MODEL_KEY_PREFIX], [`${D1_MODEL_KEY_PREFIX}￿`, []]);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([CHUNK_STORE, FILE_STORE, PARTIAL_STORE], 'readwrite');
    tx.objectStore(FILE_STORE).delete(stringKeys);
    tx.objectStore(PARTIAL_STORE).delete(stringKeys);
    tx.objectStore(CHUNK_STORE).delete(chunkKeys);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('D1 purge failed'));
    tx.onabort = () => reject(tx.error ?? new Error('D1 purge aborted'));
  });
}
