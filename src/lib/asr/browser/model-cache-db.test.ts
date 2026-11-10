import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  areModelFilesCached,
  deleteModelCache,
  downloadHfFileResumable,
} from './resumable-download';

/**
 * The model cache's own contract, with itself.
 *
 * The previous version of this file was a two-sided contract, because the cache
 * was shared: this app and `parakeet.js` both opened `parakeet-cache-db`, and
 * the version number had to satisfy both. That sharing is gone — the app
 * resolves the model's URLs itself now, so nothing outside this module reads
 * or writes the cache, and it is one database this app owns outright:
 *
 *     mn-model-cache-db, version 1
 *       chunks   [cacheKey, index] → ArrayBuffer   the bytes
 *       files    cacheKey → { size, chunkCount }   "this file is on disk"
 *       partials cacheKey → { loadedBytes, … }      resume bookkeeping
 *
 * The two failures that ended the sharing are the reason the schema is stated
 * here at all, and both are pinned below in the shape they had:
 *
 *  - **A `VersionError` that could not be fixed from here.** The app used to
 *    open `parakeet-cache-db` at version 2 to fit its partial records in a
 *    second store; `parakeet.js` opens the same name at a *hardcoded*
 *    version 1, so every one of its opens failed from then on, forever. It
 *    swallowed that at both the cache read and the cache write and fetched
 *    the model over the network instead — silently, one unreported `fetch` at
 *    a time, which is what left the preparation bar frozen on the last stage
 *    it had genuinely reached. A database with one writer cannot have that
 *    failure, and "one writer" is now a structural fact rather than a promise.
 *  - **A WebKit Blob write failure.** `hub.js` stored each file as one
 *    whole-file `Blob`, which WebKit refuses to prepare for the object store
 *    for a multi-gigabyte model. No Blob reaches `put()` here; that is
 *    asserted exhaustively in `resumable-download.cache.test.ts`, and this
 *    file pins the schema those bytes live in.
 *
 * `fake-indexeddb` is a real IndexedDB implementation, including version-change
 * and delete-blocking semantics, so `onversionchange` and `onblocked` are
 * exercised for real rather than stubbed.
 */

const CACHE_DB = 'mn-model-cache-db';
const CACHE_DB_VERSION = 1;
const CHUNK_STORE = 'chunks';
const FILE_STORE = 'files';
const PARTIAL_STORE = 'partials';
const STORES = [CHUNK_STORE, FILE_STORE, PARTIAL_STORE];

const REPO = 'istupakov/parakeet-tdt-0.6b-v3-onnx';
const FILES = ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'];

const cacheKey = (file: string) => `hf-${REPO}-main--${file}`;

function readCacheVersion(): Promise<number | null> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(null);
  return request.then((dbs) => dbs.find((d) => d.name === CACHE_DB)?.version ?? null);
}

function databaseExists(name: string): Promise<boolean> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(true);
  return request.then((dbs) => dbs.some((d) => d.name === name));
}

/**
 * Open the cache and hand it to `work`, closing it whatever happens.
 *
 * The `finally` is not tidiness. A connection left open blocks the *next*
 * test's `deleteDatabase`, which then takes its 3-second deadline and fails
 * that test too — so one real assertion failure would cascade into six
 * unrelated ones and hide the thing that actually broke.
 */
function withCacheDb<T>(work: (db: IDBDatabase) => Promise<T> | T): Promise<T> {
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

/** Write a file into the cache the way a finished download leaves it. */
function writeCachedFile(file: string, bytes = 8): Promise<void> {
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

/** Read one record straight out of a store. */
function readRecord<T>(store: string, key: string): Promise<T | undefined> {
  return withCacheDb((db) => {
    if (!db.objectStoreNames.contains(store)) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

/** Write a partial record the way an interrupted download leaves one. */
async function writePartial(file: string): Promise<void> {
  const content = new Uint8Array(64).map((_, i) => i % 256);
  const HEADERS = { 'content-length': '64', etag: '"test-etag"' };
  // A body that yields its first 32 bytes and *then* dies: the "page refreshed
  // mid-download" case. Note the two-step — `controller.error()` discards
  // whatever is still queued, so a stream that enqueues and errors in the same
  // pull delivers nothing at all and the download never starts.
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

beforeEach(async () => {
  // `fake-indexeddb` is one global database for the whole test file, so each
  // test starts from an empty cache rather than inheriting the last one's.
  // The module under test is imported once, statically: a second instance
  // would open its own connection to the same database and hold it open, and
  // the *next* test's delete would then be blocked by this one.
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

    // One version, one writer: the failure that made the old shared database
    // unusable was a second opener asking for a version the other had passed.
    expect(await readCacheVersion()).toBe(CACHE_DB_VERSION);
    const storeNames = await withCacheDb((db) => [...db.objectStoreNames].sort());
    expect(storeNames).toEqual([...STORES].sort());
  });

  it('keeps a complete file and a partial in the same database, without a version bump', async () => {
    // The old regression, in the shape it would take here: the resume records
    // used to be a second object store in a *shared* database, and needing a
    // second version for it is what broke everything. They are separate stores
    // in the same database now, which needs no version at all.
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
    // The interrupted file's resume record is still there, and separate.
    expect(await readRecord(PARTIAL_STORE, cacheKey('encoder-model.int8.onnx'))).toMatchObject({
      totalBytes: 64,
      loadedBytes: 32,
      sealedChunks: 0,
    });

    // No version-mismatch warning anywhere — the repair path stayed quiet.
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads a file another writer left in the same schema', async () => {
    // One writer is a statement about this app, not about the storage: a
    // second tab, or a future build, is free to write a file the way the
    // downloader does, and this one has to find it.
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

    // A live connection here would park this delete forever, which is exactly
    // how a user's own `indexedDB.deleteDatabase(...)` in the console came to
    // do nothing at all. `onversionchange` has to close it.
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

    // The memoised open has to be dropped along with the connection, or the
    // next read would go to a database that no longer exists.
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


    // No throw, no rejection: a cache problem must never be able to stop a
    // model from loading, and "not cached" is the only honest answer.
    await expect(areModelFilesCached({ modelRepo: REPO, files: FILES })).resolves.toEqual({
      cached: 0,
      total: 3,
      complete: false,
    });
    broken.mockRestore();
  });
});
