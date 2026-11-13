import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { areModelFilesCached, deleteModelCache } from './resumable-download';
import {
  CACHE_DB,
  CACHE_DB_VERSION,
  databaseExists,
  FILES,
  PARTIAL_STORE,
  readCacheVersion,
  readRecord,
  REPO,
  STORES,
  cacheKey,
  withCacheDb,
  writeCachedFile,
  writePartial,
} from './model-cache-db.helpers';

beforeEach(async () => {
  await deleteModelCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the model cache database', () => {
  it('is created at version 1 with exactly the three stores it documents', async () => {

    const state = await areModelFilesCached({ modelRepo: REPO, files: FILES });
    expect(state).toEqual({ cached: 0, total: 3, complete: false });

    expect(await readCacheVersion()).toBe(CACHE_DB_VERSION);
    const storeNames = await withCacheDb((db) => [...db.objectStoreNames].sort());
    expect(storeNames).toEqual([...STORES].sort());
  });

  it('keeps a complete file and a partial in the same database, without a version bump', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await writePartial('encoder-model.int8.onnx');
    for (const file of FILES) await writeCachedFile(file);

    expect(await areModelFilesCached({ modelRepo: REPO, files: FILES })).toEqual({
      cached: 3,
      total: 3,
      complete: true,
    });

    const { version, storeNames } = await withCacheDb((db) => ({
      version: db.version,
      storeNames: [...db.objectStoreNames].sort(),
    }));
    expect(version).toBe(CACHE_DB_VERSION);
    expect(storeNames).toEqual([...STORES].sort());
    expect(await readRecord(PARTIAL_STORE, cacheKey('encoder-model.int8.onnx'))).toMatchObject({
      totalBytes: 64,
      loadedBytes: 32,
      sealedChunks: 0,
    });

    expect(warn).not.toHaveBeenCalled();
  });

  it('reads a file another writer left in the same schema', async () => {
    for (const file of FILES) await writeCachedFile(file);

    expect(await areModelFilesCached({ modelRepo: REPO, files: FILES })).toEqual({
      cached: 3,
      total: 3,
      complete: true,
    });
  });

  it('reports one file short as not complete', async () => {
    await writeCachedFile(FILES[0]);
    await writeCachedFile(FILES[2]);

    expect(await areModelFilesCached({ modelRepo: REPO, files: FILES })).toEqual({
      cached: 2,
      total: 3,
      complete: false,
    });
  });

  it('closes its connection on version change, so a delete is not blocked', async () => {
    await areModelFilesCached({ modelRepo: REPO, files: FILES });

    const outcome = await new Promise<'deleted' | 'blocked'>((resolve) => {
      const request = indexedDB.deleteDatabase(CACHE_DB);
      const timer = setTimeout(() => resolve('blocked'), 500);
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve('deleted');
      };
      request.onerror = () => {
        clearTimeout(timer);
        resolve('deleted');
      };
    });

    expect(outcome).toBe('deleted');
    expect(await databaseExists(CACHE_DB)).toBe(false);
  });

  it('deletes the cache and reports it', async () => {
      await writeCachedFile(FILES[0]);
    await areModelFilesCached({ modelRepo: REPO, files: FILES });
    expect(await databaseExists(CACHE_DB)).toBe(true);

    expect(await deleteModelCache()).toEqual({ deleted: true });
    expect(await databaseExists(CACHE_DB)).toBe(false);
  });

  it('reuses the same connection after a delete instead of handing out a dead one', async () => {
      await writeCachedFile(FILES[0]);
    expect((await areModelFilesCached({ modelRepo: REPO, files: FILES })).cached).toBe(1);

    await deleteModelCache();

    expect(await areModelFilesCached({ modelRepo: REPO, files: FILES })).toEqual({
      cached: 0,
      total: 3,
      complete: false,
    });
    expect(await readCacheVersion()).toBe(CACHE_DB_VERSION);
  });

  it('treats a cache that cannot be opened at all as "not cached" rather than failing the load', async () => {
    const broken = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('IndexedDB is disabled in this context');
    });

    await expect(areModelFilesCached({ modelRepo: REPO, files: FILES })).resolves.toEqual({
      cached: 0,
      total: 3,
      complete: false,
    });
    broken.mockRestore();
  });
});
