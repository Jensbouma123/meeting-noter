import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import {
  areModelFilesCached,
  closeModelCacheConnections,
} from './resumable-download';
import {
  installCacheHooks,
  databaseExists,
} from './resumable-download.cache-fixtures';
import {
  REVISION,
  content,
  stubRepo,
} from './resumable-download.stub-repo';

installCacheHooks();

describe('the databases earlier builds wrote', () => {
  it('drops them on first use, because nothing can read them any more', async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('parakeet-cache-db', 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains('file-store')) {
          open.result.createObjectStore('file-store');
        }
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('file-store', 'readwrite');
        tx.objectStore('file-store').put(new Blob([new Uint8Array(8)]), 'hf-old--old.onnx');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    expect(await databaseExists('parakeet-cache-db')).toBe(true);

    const repo = 'test-org/legacy-sweep';
    const file = 'weights.bin';
    stubRepo(repo, file, content(16));
    await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);

    for (let attempt = 0; attempt < 50 && (await databaseExists('parakeet-cache-db')); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(await databaseExists('parakeet-cache-db')).toBe(false);
  });

  it('is never retried once done, even across separate cache connections — the page and the ASR worker each open their own', async () => {
    const deleteDbSpy = vi.spyOn(indexedDB, 'deleteDatabase');

    const repo = 'test-org/legacy-sweep-once';
    const file = 'weights.bin';
    stubRepo(repo, file, content(16));
    await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(deleteDbSpy).toHaveBeenCalled();

    closeModelCacheConnections();
    deleteDbSpy.mockClear();
    await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(deleteDbSpy).not.toHaveBeenCalled();
  });
});
