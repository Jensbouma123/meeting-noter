import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHE_CHUNK_BYTES,
  areModelFilesCached,
  closeModelCacheConnections,
  deleteModelCache,
  downloadHfFileResumable,
  ensureHfFileCached,
} from './resumable-download';

/**
 * The model cache stores bytes, and never a Blob.
 *
 * The reported Safari failure was
 *
 *     Download failed: Error preparing Blob/File data to be stored in
 *     object store
 *
 * which is WebKit refusing `IDBObjectStore.put()` of a whole-file `Blob` —
 * what the previous cache did with a 2.44 GB file, and what its periodic
 * "resume" writes did every three seconds with a growing one. Neither shape
 * is possible here: the only value that ever reaches `put()` is an
 * `ArrayBuffer` of at most `CACHE_CHUNK_BYTES`, and the only Blob this module
 * builds is the one handed back as a `blob:` URL for ONNX Runtime.
 *
 * So this is asserted the blunt way — every single `put()` in the process is
 * spied on and every value inspected, through a full download, a resume, a
 * cache hit and a delete. Not "the code we can see never does it", but "no
 * Blob was ever passed to put()", including by code added later.
 *
 * `fake-indexeddb` is a real IndexedDB implementation, so the values really
 * are structured-cloned and really are read back. It is also one global
 * database per test *file*, so every test starts by clearing the cache, and
 * each uses its own repo id: the downloader memoises a repo's file listing for
 * the page's lifetime, so two tests sharing a repo would share its file size.
 */

const DB_NAME = 'mn-model-cache-db';
const CHUNK_STORE = 'chunks';
const FILE_STORE = 'files';
const PARTIAL_STORE = 'partials';
const REVISION = 'main';

/** Every value any code in this process has handed to `put()`. */
let putValues: unknown[] = [];
let putSpy: ReturnType<typeof vi.spyOn>;

/** The real `put`, captured before anything spies on it. */
const realPut = IDBObjectStore.prototype.put;

/** Refuse exactly the byte writes — WebKit's failure, as a test double. */
function refuseByteWrites(message: string): void {
  putSpy.mockImplementation(function (this: IDBObjectStore, ...args: unknown[]) {
    if (args[0] instanceof ArrayBuffer) throw new DOMException(message, 'UnknownError');
    return Reflect.apply(realPut, this, args as never);
  });
}

/** A value, or anything inside one, is a Blob. Cycle- and depth-safe. */
function containsBlob(value: unknown, depth = 0, seen = new Set<unknown>()): boolean {
  if (value == null) return false;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  if (depth > 4 || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  // A buffer is bytes, not a container: enumerating one would walk 16 million
  // indices per chunk.
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return false;
  if (Array.isArray(value)) return value.some((item) => containsBlob(item, depth + 1, seen));
  return Object.values(value as Record<string, unknown>).some((item) =>
    containsBlob(item, depth + 1, seen),
  );
}

/**
 * Bytes that are recognisably ours, so a reordering or a duplicated range
 * shows up as a hash difference rather than a plausible-looking file.
 */
function content(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8) + (i % 7)) % 251;
  return bytes;
}

/** A hex digest, so a 16 MB comparison never becomes a 16 MB diff. */
function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

type FetchMock = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface DownloadStub {
  /** The stubbed `fetch`, so a test can wrap it and count. */
  fetch: FetchMock;
  /** How many requests have been made, for "no network round trip" checks. */
  calls: () => number;
  /** The Range headers of every body request, in order. */
  ranges: () => Array<string | null>;
}

/**
 * Serve one file of `bytes` for one repo, in `sliceBytes` pieces, honouring
 * `Range` — the shape `leadDownload` actually talks to.
 */
function stubRepo(repo: string, file: string, bytes: Uint8Array, sliceBytes = 256 * 1024): DownloadStub {
  const ranges: Array<string | null> = [];
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
    if (url.includes('/api/models/')) {
      return new Response(JSON.stringify([{ type: 'file', path: file, size: bytes.length }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(bytes.length), etag: `"${file}-etag"` },
      });
    }
    ranges.push(range);
    const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
    let sent = start;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= bytes.length) {
          controller.close();
          return;
        }
        const end = Math.min(bytes.length, sent + sliceBytes);
        controller.enqueue(bytes.subarray(sent, end));
        sent = end;
      },
    });
    return new Response(body, {
      status: range ? 206 : 200,
      headers: { 'content-length': String(bytes.length - start), etag: `"${file}-etag"` },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fetch: fn as unknown as FetchMock, calls: () => fn.mock.calls.length, ranges: () => ranges };
}

/** Open the cache database directly, without going through the module. */
function withDb<T>(work: (db: IDBDatabase) => Promise<T> | T): Promise<T> {
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

function readStore<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return withDb((db) => {
    if (!db.objectStoreNames.contains(store)) return undefined;
    return new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

function readAllKeys(store: string): Promise<string[]> {
  return withDb((db) => {
    if (!db.objectStoreNames.contains(store)) return [];
    return new Promise<string[]>((resolve, reject) => {
      const request = db.transaction(store, 'readonly').objectStore(store).getAllKeys();
      request.onsuccess = () => resolve(request.result.map(String).sort());
      request.onerror = () => reject(request.error);
    });
  });
}

function databaseExists(name: string): Promise<boolean> {
  const request = indexedDB.databases?.();
  if (!request) return Promise.resolve(true);
  return request.then((dbs) => dbs.some((d) => d.name === name));
}

async function bytesBehind(blobUrl: string): Promise<Uint8Array> {
  const response = await fetch(blobUrl);
  return new Uint8Array(await response.arrayBuffer());
}

beforeEach(async () => {
  await deleteModelCache();
  putValues = [];
  // `vi.spyOn` keeps the original implementation, so this records every value
  // handed to `put()` without changing a single behaviour.
  putSpy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: unknown[]
  ) {
    putValues.push(args[0]);
    return Reflect.apply(realPut, this, args as never);
  });
});

afterEach(() => {
  putSpy.mockRestore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the model cache never puts a Blob', () => {
  it('splits a file larger than one chunk into ArrayBuffer records, in order', async () => {
    // Bigger than one chunk on purpose: a single-chunk file would pass even
    // with the chunking broken.
    const repo = 'test-org/multi-chunk';
    const file = 'encoder-model.onnx';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 5000);
    stubRepo(repo, file, bytes);

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    // 1. What reached `put()`: never a Blob, anywhere, at any depth — and the
    //    byte values are buffers of at most one chunk.
    expect(putValues.length).toBeGreaterThan(0);
    expect(putValues.filter((value) => containsBlob(value))).toEqual([]);
    const byteValues = putValues.filter((value): value is ArrayBuffer => value instanceof ArrayBuffer);
    expect(byteValues.length).toBeGreaterThanOrEqual(2);
    expect(byteValues.every((value) => value.byteLength <= CACHE_CHUNK_BYTES)).toBe(true);

    // 2. The store really is chunked, keyed `[cacheKey, index]`.
    expect(await readAllKeys(CHUNK_STORE)).toEqual([`${key},0`, `${key},1`]);
    expect((await readStore<ArrayBuffer>(CHUNK_STORE, [key, 0]))?.byteLength).toBe(CACHE_CHUNK_BYTES);
    expect((await readStore<ArrayBuffer>(CHUNK_STORE, [key, 1]))?.byteLength).toBe(5000);

    // 3. The record that makes it "cached" describes exactly those two chunks,
    //    and the resume record is gone.
    expect(await readStore(FILE_STORE, key)).toMatchObject({ size: bytes.length, chunkCount: 2 });
    expect(await readStore(PARTIAL_STORE, key)).toBeUndefined();

    // 4. The round trip is byte-exact: no duplicated range, no gap, in order.
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('serves a whole file back from the cache, without refetching the body', async () => {
    const repo = 'test-org/cache-hit';
    const file = 'weights.bin';
    const bytes = content(CACHE_CHUNK_BYTES + 1);
    const stub = stubRepo(repo, file, bytes);
    await downloadHfFileResumable(repo, file, REVISION);
    const afterFirst = stub.calls();

    const cachedUrl = await downloadHfFileResumable(repo, file, REVISION);

    // The file listing is memoised, so a warm cache costs nothing at all.
    expect(stub.calls()).toBe(afterFirst);
    expect(sha256(await bytesBehind(cachedUrl))).toBe(sha256(bytes));
    expect(putValues.filter((value) => containsBlob(value))).toEqual([]);
  });

  it('resumes an interrupted download across a chunk boundary', async () => {
    const repo = 'test-org/resume-across-chunk';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    // A file whose first chunk is full and whose tail is not: a resume has to
    // re-attach a stored prefix *and* a stored short tail.
    const bytes = content(CACHE_CHUNK_BYTES + 2000);
    const base = stubRepo(repo, file, bytes);
    const cutoff = CACHE_CHUNK_BYTES + 1000;

    // First attempt: the connection dies just past the chunk boundary.
    let sent = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        if (String(input).includes('/api/models/') || init?.method === 'HEAD') {
          return base.fetch(input, init);
        }
        return new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (sent >= cutoff) {
                controller.error(new Error('simulated: connection dropped (page refreshed)'));
                return;
              }
              const end = Math.min(cutoff, sent + 256 * 1024);
              controller.enqueue(bytes.subarray(sent, end));
              sent = end;
            },
          }),
          { status: 200, headers: { etag: `"${file}-etag"` } },
        );
      }),
    );
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    // Something resumable is on disk, and it is all bytes.
    expect(await readStore(PARTIAL_STORE, key)).toMatchObject({
      totalBytes: bytes.length,
      sealedChunks: 1,
    });
    expect(putValues.filter((value) => containsBlob(value))).toEqual([]);

    // Second attempt: the server honours the Range, and the file completes
    // with the prefix and the tail spliced in the right places.
    const second = stubRepo(repo, file, bytes);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);
    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    expect(await readStore(FILE_STORE, key)).toMatchObject({ size: bytes.length, chunkCount: 2 });
    expect(putValues.filter((value) => containsBlob(value))).toEqual([]);
  });

  it('frees the bytes on "Delete downloaded models"', async () => {
    const repo = 'test-org/delete-me';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 10);
    stubRepo(repo, file, bytes);
    await ensureHfFileCached(repo, file, REVISION);
    expect(await readAllKeys(CHUNK_STORE)).toEqual([`${key},0`, `${key},1`]);

    expect(await deleteModelCache()).toEqual({ deleted: true });

    // A deleted database is reported as absent; anything left behind would be
    // the multi-gigabyte cache the user asked to reclaim.
    expect(await databaseExists(DB_NAME)).toBe(false);
    // And the next download starts from nothing, which is the only honest
    // state after a delete.
    const { cached } = await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);
    expect(cached).toBe(0);
  });
});

describe('a cache that refuses the bytes', () => {
  it('still hands the caller its file, logs it, and says it will re-download', async () => {
    const repo = 'test-org/refused-partial';
    const file = 'weights.bin';
    const bytes = content(4096);
    stubRepo(repo, file, bytes);
    refuseByteWrites('Error preparing Blob/File data to be stored in object store');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings: string[] = [];

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION, {
      onCacheWarning: (message) => warnings.push(message),
    });

    // The model still works: the caller gets the bytes it asked for, from
    // memory, because a cache that cannot be written is not a failed download.
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    // It is reported, not swallowed…
    expect(errors).toHaveBeenCalled();
    expect(String(errors.mock.calls[0][0])).toMatch(/could not write/i);
    // …as the non-fatal notice: usable now, gone next time.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/downloaded again the next time/i);
  });

  it('leaves no record claiming a file the cache never took', async () => {
    // The same failure on the cache-warming path, which is what the Download
    // button uses: the bytes are gone, so nothing may claim otherwise.
    const repo = 'test-org/refused-warm';
    const file = 'weights.bin';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(2048);
    stubRepo(repo, file, bytes);
    refuseByteWrites('quota exceeded');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnings: string[] = [];

    await expect(
      ensureHfFileCached(repo, file, REVISION, {
        onCacheWarning: (message) => warnings.push(message),
      }),
    ).resolves.toBeUndefined();

    expect(warnings[0]).toMatch(/downloaded again the next time/i);
    expect(await readStore(FILE_STORE, key)).toBeUndefined();
    expect(await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION)).toEqual({
      cached: 0,
      total: 1,
      complete: false,
    });
  });
});

describe('the databases earlier builds wrote', () => {
  it('drops them on first use, because nothing can read them any more', async () => {
    // Reproduce the old cache: one whole-file Blob under the old key shape.
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

    // The sweep is deliberately not awaited (a cache must not hold up a load),
    // so give the delete a moment before asking about it.
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
    // Give the not-awaited sweep a moment to run and persist its flag.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(deleteDbSpy).toHaveBeenCalled();

    // A worker importing this module fresh still shares the same on-disk
    // flag: closing the cached connection (without deleting any data) and
    // reopening it stands in for that second, independent realm.
    closeModelCacheConnections();
    deleteDbSpy.mockClear();
    await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(deleteDbSpy).not.toHaveBeenCalled();
  });
});
