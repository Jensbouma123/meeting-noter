/** Resumable Hugging Face file downloader, and the model cache it owns.
 *
 * `parakeet.js`'s own `fromHub`/`getModelFile` does a single `fetch(url)`,
 * buffers the whole response in memory, and only ever writes a *complete*
 * blob to IndexedDB — a page refresh mid-download loses everything and the
 * next load starts the ~2.5 GB encoder over from byte zero. This module
 * replaces that path for the manifest's files: it fetches with an HTTP
 * `Range` request when the server supports it (verified live against the
 * HF/CDN redirect target — see `resumable-download.test.ts`), persists
 * partial progress to IndexedDB as it goes, and validates the final byte
 * count before ever marking a file complete.
 *
 * ## This cache is ours, and it never stores a Blob
 *
 * Two things about `parakeet.js`'s IndexedDB cache forced it out of this
 * app's path entirely:
 *
 * 1. **It stores Blobs.** `hub.js` does `store.put(blob, key)` with the whole
 *    file — for the WebGPU manifest, one 2.44 GB record. WebKit cannot
 *    always prepare a Blob for the object store ("Error preparing Blob/File
 *    data to be stored in object store"), especially for a Blob assembled
 *    from a stream of response chunks, and the failure is fatal to whatever
 *    was awaiting the `put`. That is the reported bug: Delete downloaded
 *    models, press Download, and the button reports
 *    `Download failed: Error preparing Blob/File data to be stored in
 *    object store`.
 * 2. **It is not configurable.** The store name, the key shape, the version
 *    and the Blob are all hardcoded (`node_modules/parakeet.js/src/hub.js`),
 *    and the loader asks it for URLs. Sharing that store was also the cause
 *    of the `VersionError` in the previous fix (see below).
 *
 * So the app stopped sharing it: nothing here calls `getModelFile` /
 * `getParakeetModel` any more, which means the hub's cache is never read and
 * never written — it is disabled by having no callers, and this module is the
 * only thing that persists model bytes. `parakeet.ts` resolves the URLs
 * itself (from the manifest, which already lists every file) and hands them
 * to the same `ParakeetModel.fromUrls()` `fromHub()` uses internally, so
 * nothing downstream of "which URLs does the model load from" changes.
 *
 * What is stored instead is the same bytes in the same order, as an array of
 * `ArrayBuffer` **chunks** of `CACHE_CHUNK_BYTES`. No single `put` is ever
 * larger than one chunk, no Blob is ever constructed for storage, and — the
 * reason the downloader streams rather than buffers — a file does not have to
 * fit in the JS heap to be downloaded: bytes go to the store as they arrive
 * and the buffer is reused for the next chunk.
 */

import type { AsrModelManifest } from './model-manifest';
import { Sha256 } from './sha256';

/* ------------------------------------------------------------------ */
/* Pure decision logic — unit-tested directly, no browser APIs involved */
/* ------------------------------------------------------------------ */

export type ResumeDecision = 'skip' | 'restart' | 'resume';

export interface PartialFileState {
  loadedBytes: number;
  totalBytes: number;
  /** Validation token from the attempt that produced this partial (ETag or
   *  equivalent). `null` when the server didn't provide one. */
  etag: string | null;
}

export interface FreshFileMeta {
  totalBytes: number;
  etag: string | null;
}

/**
 * Decide what to do with a previously-interrupted download given the
 * server's current view of the file.
 *
 * - No partial on record → 'restart' (a plain first download).
 * - The remote file's size (or, when both sides have one, its ETag) no
 *   longer matches what the partial was downloaded against → 'restart':
 *   the file changed upstream, so resuming would silently splice two
 *   different versions together.
 * - The partial already claims to hold >= the full size → 'restart': that
 *   can only mean corruption (a resumed download can't legitimately end up
 *   with more bytes than the server reports), never a normal state.
 * - Otherwise → 'resume' from `partial.loadedBytes`.
 */
export function decideResume(partial: PartialFileState | null, fresh: FreshFileMeta): ResumeDecision {
  if (!partial) return 'restart';
  if (partial.totalBytes !== fresh.totalBytes) return 'restart';
  if (partial.etag !== null && fresh.etag !== null && partial.etag !== fresh.etag) return 'restart';
  if (partial.loadedBytes <= 0) return 'restart';
  if (partial.loadedBytes >= fresh.totalBytes) return 'restart';
  return 'resume';
}

/** Whether a completed download's actual size matches what the server reported. */
export function isSizeValid(actualBytes: number, expectedBytes: number): boolean {
  return Number.isFinite(actualBytes) && actualBytes === expectedBytes;
}

/** Files larger than this are size-validated only — hashing them would mean
 *  holding a second full in-memory copy of a multi-gigabyte blob just to
 *  compute a checksum. */
const MAX_HASH_VERIFY_BYTES = 200 * 1024 * 1024;

export function shouldVerifyHash(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_HASH_VERIFY_BYTES;
}

/**
 * How long the download body may go without yielding a chunk before the
 * download is treated as stalled.
 *
 * Long enough that no healthy transfer trips it: every chunk re-arms it, so
 * only genuine silence — a dead HTTP/2 stream, an unanswered `Range`
 * request, a wedged storage transaction — fails. Short enough that a stuck
 * multi-gigabyte download surfaces while the user is still looking at it.
 */
export const DOWNLOAD_STALL_MS = 60_000;

/** Minimum gap between cross-tab progress posts from one leader download. */
export const PROGRESS_BROADCAST_INTERVAL_MS = 250;

/** The actionable message a stalled download fails with. */
function describeDownloadStall(filename: string, ms: number): string {
  return (
    `Download of ${filename} stalled: no data arrived for ${Math.round(ms / 1000)} seconds. ` +
    'This usually means the connection dropped without closing, or the browser storage holding ' +
    'the download stopped responding — check your connection and try again. What already arrived ' +
    'is kept, so retrying resumes where this left off.'
  );
}

/**
 * Detach a timer from the process's lifetime, where the platform allows it.
 *
 * The stall watchdog is always cleared on settle, but a page torn down
 * mid-download must not keep a worker alive for the remainder of the
 * deadline — and neither should a test runner. No-op in browsers, which have
 * no `unref`.
 */
function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  const t = timer as unknown as { unref?: () => void };
  if (typeof t.unref === 'function') t.unref();
}

export type ManifestFileRole =
  | 'encoder'
  | 'encoderData'
  | 'decoder'
  | 'decoderData'
  | 'joint'
  | 'jointData'
  | 'tokenizer'
  | 'preprocessor'
  | 'unknown';

/**
 * Classify a manifest filename by what `ParakeetModel.fromUrls` expects it
 * for. The manifest is the single source of truth for the filenames
 * themselves (see `model-manifest.ts`), so this is pattern matching against
 * that small, explicit, hand-maintained list — not a guess against
 * arbitrary repo contents.
 */
export function categorizeManifestFile(filename: string): ManifestFileRole {
  if (filename === 'vocab.txt' || filename === 'tokens.txt') return 'tokenizer';
  // Nemotron's three graphs (see `NEMOTRON_ASR_WEBGPU`), each with external data.
  const nemotron = /^(encoder|decoder|joint)\.onnx(\.data)?$/.exec(filename);
  if (nemotron) {
    const role = nemotron[1] === 'encoder' ? 'encoder' : nemotron[1] === 'decoder' ? 'decoder' : 'joint';
    return nemotron[2] ? `${role}Data` : role;
  }
  if (/^nemo\d+\.onnx$/.test(filename)) return 'preprocessor';
  if (filename.startsWith('encoder-model')) {
    return filename.endsWith('.data') ? 'encoderData' : 'encoder';
  }
  if (filename.startsWith('decoder_joint-model') || filename.startsWith('decoder-model')) {
    return filename.endsWith('.data') ? 'decoderData' : 'decoder';
  }
  return 'unknown';
}

/* ------------------------------------------------------------------ */
/* HuggingFace metadata lookup                                         */
/* ------------------------------------------------------------------ */

interface HfTreeEntry {
  path?: unknown;
  size?: unknown;
  oid?: unknown;
  lfs?: { oid?: unknown };
}

/** Per-repo, per-revision tree listing cache — avoids refetching for every file. */
const treeCache = new Map<string, Promise<HfTreeEntry[] | null>>();

function fetchRepoTree(repoId: string, revision: string): Promise<HfTreeEntry[] | null> {
  const cacheKey = `${repoId}@${revision}`;
  const cached = treeCache.get(cacheKey);
  if (cached) return cached;

  const encoded = repoId.split('/').map(encodeURIComponent).join('/');
  const url = `https://huggingface.co/api/models/${encoded}/tree/${encodeURIComponent(revision)}?recursive=1`;
  const promise = fetch(url)
    .then((res) => (res.ok ? (res.json() as Promise<HfTreeEntry[]>) : null))
    .catch(() => null);
  treeCache.set(cacheKey, promise);
  return promise;
}

/** A file's expected size and (LFS) sha256, straight from the HF tree API. */
export async function getRepoFileMeta(
  repoId: string,
  revision: string,
  filename: string,
): Promise<{ size: number; sha256: string | null } | null> {
  const tree = await fetchRepoTree(repoId, revision);
  if (!tree) return null;

  const entry = tree.find((n) => n.path === filename);
  if (!entry || typeof entry.size !== 'number') return null;

  const sha256 = typeof entry.lfs?.oid === 'string' ? entry.lfs.oid : null;
  return { size: entry.size, sha256 };
}

/* ------------------------------------------------------------------ */
/* IndexedDB — one database, ours alone                                 */
/*                                                                      */
/* `parakeet.js` keeps a cache of its own in a database it opens with a  */
/* *hardcoded version 1* and a hardcoded store name, and it writes the    */
/* whole file as one Blob (`node_modules/parakeet.js/src/hub.js`). This   */
/* app used to share that database so a file downloaded once was found   */
/* by `getParakeetModel` with no second network round trip. Both halves  */
/* of that are now gone: the sharing is unnecessary (this module resolves */
/* the URLs itself — see the module doc) and it was not survivable.      */
/*                                                                      */
/* What sharing cost, in order of discovery:                             */
/*                                                                      */
/* - **A version conflict that could not be fixed from here.** This      */
/*   module opened `parakeet-cache-db` at version 2 to fit its          */
/*   in-progress records in a second store. IndexedDB rejects a request  */
/*   for a version *lower* than the one on disk with a `VersionError`,   */
/*   permanently, so the hub's hardcoded `open(name, 1)` failed forever  */
/*   and it silently fell back to the network — the multi-gigabyte       */
/*   encoder being re-fetched inside a function that reports nothing,    */
/*   which is what left the UI frozen on "Initializing 35%".            */
/* - **A WebKit Blob write failure** — see the module doc.              */
/*                                                                      */
/* Neither is reachable now, because nothing in this app opens a         */
/* database it does not own. The whole cache is one database, opened at   */
/* one version by one code path:                                         */
/*                                                                      */
/* - `mn-model-cache-db` (version 1)                                     */
/*     - `chunks`   — `[cacheKey, index] → ArrayBuffer`, the bytes.     */
/*     - `files`    — `cacheKey → { size, chunkCount }`. The *presence*  */
/*       of a record here is the definition of "this file is on disk",   */
/*       and it is written last, after every chunk has committed: a      */
/*       half-written file can never read as complete.                  */
/*     - `partials` — `cacheKey → { loadedBytes, sealedChunks, … }`,    */
/*       the resume bookkeeping. The bytes it refers to are the `chunks` */
/*       records, so promoting a partial to complete is a metadata flip  */
/*       rather than a multi-gigabyte copy between databases.            */
/*                                                                      */
/* The databases earlier builds wrote (`parakeet-cache-db`,             */
/* `parakeet-partials-db`) are dropped on first use. Their contents are  */
/* unreadable by design — whole-file Blobs under a key shape this module */
/* no longer writes — and leaving a multi-gigabyte cache behind that      */
/* nothing can ever reclaim is worse than one clean re-download.         */
/*                                                                      */
/* And a cache problem is never allowed to be fatal: every write is      */
/* best-effort, a failure is logged and reported as a non-fatal notice,  */
/* and the load continues from the bytes already in memory.              */
/* ------------------------------------------------------------------ */

const CACHE_DB_NAME = 'mn-model-cache-db';
const CACHE_DB_VERSION = 1;

/** Byte records, keyed `[cacheKey, index]`. Only ever an `ArrayBuffer`. */
const CHUNK_STORE = 'chunks';
/** Complete-file records, keyed `cacheKey` — see the block comment above. */
const FILE_STORE = 'files';
/** In-progress download records, keyed `cacheKey`. */
const PARTIAL_STORE = 'partials';

/** The stores that make up the cache, created together at version 1. */
const CACHE_DB_STORES = [CHUNK_STORE, FILE_STORE, PARTIAL_STORE] as const;

/** The two metadata stores, which share every accessor below. */
type MetaStore = typeof FILE_STORE | typeof PARTIAL_STORE;

/**
 * Databases written by earlier builds of this app, in an unreadable format.
 *
 * Deleted (best effort, with a deadline) on first use of the cache this
 * module owns, and by "Delete downloaded models". See the block comment.
 */
const LEGACY_DB_NAMES = ['parakeet-cache-db', 'parakeet-partials-db'] as const;

/**
 * How many bytes go into one `chunks` record.
 *
 * The floor is WebKit's willingness to write a single value at all: the
 * reported failure was a multi-hundred-megabyte Blob, and 16 MiB is small
 * enough that a structured-clone write of it is never the interesting part
 * of a transaction. The ceiling is the memory cost of a *put* — the chunk is
 * still in the JS heap while the browser copies it into the store — so this
 * is deliberately two orders of magnitude below the 2.44 GB file it has to
 * carry, and a download of any size streams through one buffer of this size
 * rather than through the file.
 */
export const CACHE_CHUNK_BYTES = 16 * 1024 * 1024;

/**
 * One chunk's bytes.
 *
 * Pinned to an `ArrayBuffer`-backed view rather than the default
 * `ArrayBufferLike`: that is what a network reader, a structured clone and
 * `crypto.subtle.digest` all produce and all accept, and it keeps "this is a
 * real buffer" from being a question at every call site.
 */
type ChunkBytes = Uint8Array<ArrayBuffer>;

/** A file that is complete in the cache. Its presence *is* the cache. */
interface CachedFileRecord {
  /** Total bytes across all chunks. */
  size: number;
  /** How many `chunks` records the file is made of. */
  chunkCount: number;
  updatedAt: number;
}

/**
 * A file that is being (or was being) downloaded.
 *
 * No bytes here: they are the `chunks` records under the same key, so
 * resuming reads them back instead of re-copying a growing Blob every few
 * seconds — which is the other WebKit write that could fail mid-download.
 */
interface PartialFileRecord {
  /** Bytes already stored across all chunk records. */
  loadedBytes: number;
  totalBytes: number;
  /** Validation token from the attempt that produced this partial. */
  etag: string | null;
  /**
   * How many leading chunks are *sealed* (exactly `CACHE_CHUNK_BYTES`
   * each). The record at index `sealedChunks` is the tail, which is
   * rewritten on every flush and may be any length below a full chunk.
   */
  sealedChunks: number;
  updatedAt: number;
}


/* ------------------------------------------------------------------ */
/* Pure chunk arithmetic — unit-tested directly, no browser APIs involved */
/* ------------------------------------------------------------------ */

/** Where one `chunks` record sits inside its file. */
export interface ChunkRange {
  index: number;
  /** First byte of the file this record holds. */
  start: number;
  /** One past its last byte. */
  end: number;
}

/** How many `chunks` records a file of `size` bytes is made of. */
export function chunkCountFor(size: number, chunkBytes: number = CACHE_CHUNK_BYTES): number {
  if (!Number.isFinite(size) || size <= 0 || chunkBytes <= 0) return 0;
  return Math.ceil(size / chunkBytes);
}

/**
 * The byte range of every `chunks` record for a file of `size` bytes.
 *
 * The last range is short when the file is not a whole multiple of
 * `chunkBytes`; a *partial* download's last record is short for the same
 * reason and is rewritten until it fills (see `ChunkWriter`).
 */
export function planChunkRanges(size: number, chunkBytes: number = CACHE_CHUNK_BYTES): ChunkRange[] {
  const ranges: ChunkRange[] = [];
  for (let start = 0, index = 0; start < size; start += chunkBytes, index += 1) {
    ranges.push({ index, start, end: Math.min(size, start + chunkBytes) });
  }
  return ranges;
}

/* ------------------------------------------------------------------ */
/* Opening, closing and deleting the cache                              */
/* ------------------------------------------------------------------ */

/** How long to wait for a blocked `deleteDatabase` before giving up on it. */
const DELETE_DEADLINE_MS = 3000;

let cacheDbPromise: Promise<IDBDatabase> | null = null;
/**
 * The live connection behind that promise, so it can be closed without first
 * *opening* it — a teardown that has to create what it is about to release is
 * a teardown that can block itself.
 */
let cacheDbRef: IDBDatabase | null = null;

/**
 * Close a connection we hold.
 *
 * Both the `versionchange` and the explicit-teardown paths need this, and it
 * is the *only* thing that keeps a connection from blocking somebody else's
 * `deleteDatabase` — which is exactly how the user's own
 * `indexedDB.deleteDatabase('parakeet-cache-db')` in the console came to
 * no-op, and why it stayed stuck across a reload.
 */
function closeQuietly(db: IDBDatabase | null): void {
  try {
    db?.close();
  } catch {
    // Already closing/closed — nothing to release.
  }
}

/**
 * `deleteDatabase` with a deadline.
 *
 * `'deleted'` covers both "it went" and "there was nothing to delete" — a
 * failed delete request is the same outcome as a delete of an absent database
 * from here. `'blocked'` means another connection is holding it open, and the
 * caller must carry on regardless: this is a cache, and a cache that cannot be
 * cleared is an inconvenience, never a reason to stop working.
 */
function deleteDatabaseWithinDeadline(
  name: string,
  timeoutMs = DELETE_DEADLINE_MS,
): Promise<'deleted' | 'blocked'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: 'deleted' | 'blocked') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const timer = setTimeout(() => {
      console.warn(
        `[resumable-download] "${name}" is held open by another connection; ` +
          'continuing without clearing it.',
      );
      finish('blocked');
    }, timeoutMs);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.deleteDatabase(name);
    } catch {
      finish('deleted');
      return;
    }
    request.onsuccess = () => finish('deleted');
    request.onerror = () => finish('deleted');
    // `onblocked` only says "waiting" — the deadline decides, so that a
    // connection nobody will ever close cannot park this promise forever.
    request.onblocked = () => {};
  });
}

/**
 * Open our cache, creating it at version 1 with the three stores if it is not
 * there yet.
 *
 * The version is stated explicitly because this database has exactly one
 * writer — unlike the `parakeet-cache-db` it replaced, whose version was
 * dictated by a third party's hardcoded `open(name, 1)`.
 *
 * `onversionchange` is not optional: without it *our* connection is one more
 * thing standing between a user and `indexedDB.deleteDatabase()`, which is
 * how the console call in the bug report never completed.
 */
function openCacheDb(): Promise<IDBDatabase> {
  if (!cacheDbPromise) {
    // Memoised, but a failed open must not be cached for the page's lifetime —
    // the next caller retries, because a cache failure is never fatal (see
    // `isModelFileCached`).
    cacheDbPromise = openDatabase(CACHE_DB_NAME, CACHE_DB_VERSION, CACHE_DB_STORES)
      .then((db) => {
        cacheDbRef = db;
        // Not awaited: a cache is an optimisation, and nothing in the app
        // reads the legacy databases (see the block comment). Deleting them
        // reclaims a multi-gigabyte cache this app can no longer read and can
        // therefore never clear again; losing the race against a connection
        // nobody will close is harmless, and the deadline guarantees it cannot
        // park the page.
        dropLegacyDatabases();
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

/**
 * Marks the legacy sweep as done, in `FILE_STORE` of the cache database this
 * module owns. A record here, not a page-lifetime flag: the page and the ASR
 * worker are separate JS realms (see `parakeet.ts`'s log-suppression doc)
 * with their own module state, so an in-memory flag stops neither realm from
 * running (and logging) the sweep every time it opens the cache — including
 * on every later page load, since nothing else remembers it already ran.
 * IndexedDB is the one thing both realms actually share, so it is what makes
 * this survive both. The key can never collide with a real cache key (see
 * `cacheKey()`), and `deleteModelCache()`/`beforeEach` in tests clear it along
 * with everything else in this database, which is the intended reset.
 */
const LEGACY_SWEEP_DONE_KEY = '__mn-legacy-sweep-done__';

/**
 * Delete the databases earlier builds wrote — once, ever, for this browser
 * profile.
 *
 * Guarded by `LEGACY_SWEEP_DONE_KEY` rather than run unconditionally: deleting
 * an absent database is a request that resolves immediately, but doing that
 * (and printing the notice) from both the page and the ASR worker, on every
 * page load forever, is exactly the noise this guard removes. Once the flag
 * is set, the databases are known gone and never worth asking about again —
 * nothing in this app ever recreates them.
 *
 * Not awaited and never thrown from: the contents are in a format this app no
 * longer reads, and a delete that cannot complete (some other connection still
 * holds it) is an inconvenience, not a failure.
 */
function dropLegacyDatabases(): void {
  void getMetaRecord<{ done: boolean }>(FILE_STORE, LEGACY_SWEEP_DONE_KEY)
    .catch(() => undefined)
    .then((flag) => {
      if (flag) return;
      void putMetaRecord(FILE_STORE, LEGACY_SWEEP_DONE_KEY, { done: true }).catch(() => {});
      for (const name of LEGACY_DB_NAMES) {
        void deleteDatabaseWithinDeadline(name).then((outcome) => {
          if (outcome === 'deleted') {
            console.debug(
              `[resumable-download] Dropped the legacy cache database "${name}": its whole-file ` +
                'Blob records are in a format this app no longer reads. Models will be ' +
                'downloaded again once, into the chunked cache.',
            );
          }
        });
      }
    });
}

/* ------------------------------------------------------------------ */
/* IndexedDB primitives — the only code in the app that writes to IDB,   */
/* and none of it ever hands a Blob to `put()`                          */
/* ------------------------------------------------------------------ */

/** Run `work` in one transaction over one store; resolves when it commits. */
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

/**
 * One request, resolving with its result.
 *
 * Awaiting inside a transaction is safe: the promise settles from the
 * request's own success event, so the transaction has not had a turn to
 * auto-commit yet.
 */
function requestOnce<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * A chunk, as something the structured clone algorithm accepts.
 *
 * `ArrayBuffer` (never a `Blob`) is the whole point of the rewrite — this is
 * the value that reaches `put()`. A `Uint8Array` that *is* its whole buffer
 * (what a network reader hands over) is passed through as-is, so persisting
 * a chunk does not copy it in JS first; a view into a larger buffer has to be
 * copied out, or the structured clone would take the whole parent buffer with
 * it.
 */
function storableChunk(bytes: Uint8Array): ArrayBuffer {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? (bytes.buffer as ArrayBuffer)
    : bytes.slice().buffer;
}

async function getMetaRecord<T>(store: MetaStore, key: string): Promise<T | undefined> {
  const db = await openCacheDb();
  const tx = db.transaction(store, 'readonly');
  const value = await requestOnce<T | undefined>(tx.objectStore(store).get(key));
  return value ?? undefined;
}

function putMetaRecord(store: MetaStore, key: string, value: unknown): Promise<void> {
  return transact(store, 'readwrite', (s) => {
    s.put(value as never, key);
  });
}

function deleteMetaRecord(store: MetaStore, key: string): Promise<void> {
  return transact(store, 'readwrite', (s) => {
    s.delete(key);
  });
}

/** One `chunks` record. The only value in the whole app that holds bytes. */
function putChunk(key: string, index: number, bytes: Uint8Array): Promise<void> {
  return transact(CHUNK_STORE, 'readwrite', (s) => {
    s.put(storableChunk(bytes), [key, index] as IDBValidKey);
  });
}

async function getChunk(key: string, index: number): Promise<ChunkBytes | null> {
  const db = await openCacheDb();
  const tx = db.transaction(CHUNK_STORE, 'readonly');
  const value = await requestOnce<ArrayBuffer | undefined>(
    tx.objectStore(CHUNK_STORE).get([key, index] as IDBValidKey),
  );
  return value ? new Uint8Array(value) : null;
}

/**
 * Every chunk of a file, in order.
 *
 * One transaction for all of them: 150 round trips for the 2.44 GB encoder
 * would be 150 chances for one of them to be slow, and the store does not
 * need to see the reads one at a time to serve them.
 */
async function getChunks(key: string, count: number): Promise<ChunkBytes[]> {
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

/**
 * Delete a file's chunks from `fromIndex` up.
 *
 * Needed whenever the byte count a key holds can *shrink*: a file replaced
 * upstream, a partial abandoned for a fresh start, or a shorter download
 * replacing a longer one under the same cache key. IndexedDB has no
 * "truncate by count", and a key range is the one call that does it — with
 * `[key, number]` comparing element-wise, `Number.MAX_SAFE_INTEGER` is above
 * every index this module writes.
 */
function deleteChunksFrom(key: string, fromIndex: number): Promise<void> {
  return transact(CHUNK_STORE, 'readwrite', (s) => {
    s.delete(
      IDBKeyRange.bound(
        [key, fromIndex] as IDBValidKey,
        [key, Number.MAX_SAFE_INTEGER] as IDBValidKey,
      ) as unknown as IDBValidKey,
    );
  });
}

/* ------------------------------------------------------------------ */
/* The cache, at file granularity                                       */
/* ------------------------------------------------------------------ */

/** A complete file, read back out of the cache. */
interface CachedFile {
  record: CachedFileRecord;
  /** Every chunk, in order. Only populated on demand (it is the whole file). */
  parts: ChunkBytes[];
}

async function readCachedFile(key: string): Promise<CachedFile | null> {
  const record = await getMetaRecord<CachedFileRecord>(FILE_STORE, key);
  if (!record) return null;
  const parts = await getChunks(key, record.chunkCount);
  // The record is the claim; the chunks are the evidence. If they disagree —
  // a truncated store, a Safari eviction that took the bytes but not the
  // record — the honest answer is "not cached", and leaving the record in
  // place would make every later read pay for the same wrong answer.
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  if (parts.some((part) => part.byteLength === 0) || total !== record.size) {
    console.warn(
      `[resumable-download] Cached "${key}" is incomplete on disk (${total} of ${record.size} bytes) ` +
        '— treating it as not cached.',
    );
    await deleteCachedFile(key);
    return null;
  }
  return { record, parts };
}

/** Forget one file completely: its chunks and both metadata records. */
async function deleteCachedFile(key: string): Promise<void> {
  await Promise.all([
    deleteChunksFrom(key, 0),
    deleteMetaRecord(FILE_STORE, key).catch(() => {}),
    deleteMetaRecord(PARTIAL_STORE, key).catch(() => {}),
  ]);
}

/** Whether a cache key already has a complete file behind it. */
async function isModelFileCachedByKey(key: string): Promise<boolean> {
  try {
    return (await getMetaRecord<CachedFileRecord>(FILE_STORE, key)) != null;
  } catch {
    // No storage at all: the only honest answer is "not there", and the load
    // path that asks will fetch it.
    return false;
  }
}

/**
 * The bytes behind each `blob:` URL this module handed out, so a consumer can
 * skip fetching the URL. WebKit serves a large Blob through a multipart
 * loader, and fetching a ~500 MB model that way fails with "Too much data
 * buffered while waiting for the previous multipart part to be handled" —
 * which `InferenceSession.create(url)` reports as a bare "Load failed".
 * ONNX Runtime also accepts the model as a `Uint8Array`, which never touches
 * that loader. Entries are removed by `takeBlobUrlBytes()`.
 */
const blobUrlBytes = new Map<string, ChunkBytes>();

/** A `blob:` URL for a cached file — the only Blob this module ever builds. */
function blobUrlFor(parts: ChunkBytes[]): string {
  let bytes: ChunkBytes;
  if (parts.length === 1) {
    bytes = parts[0];
  } else {
    const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  blobUrlBytes.set(url, bytes);
  return url;
}

/**
 * The bytes behind a `blob:` URL from this module, or `null` for any other
 * URL. One-shot: the entry is dropped so the bytes can be collected once the
 * caller is done with them.
 */
export function takeBlobUrlBytes(url: string): Uint8Array | null {
  const bytes = blobUrlBytes.get(url) ?? null;
  blobUrlBytes.delete(url);
  return bytes;
}

/* ------------------------------------------------------------------ */
/* Clearing the cache on request                                        */
/* ------------------------------------------------------------------ */

/** What happened to the on-disk model cache when we tried to delete it. */
export interface DeleteModelCacheResult {
  /** `true` when nothing is left holding the cache open; `false` when another
   *  connection is, and the bytes are therefore still on disk. */
  deleted: boolean;
}

/**
 * Delete every downloaded model file from IndexedDB.
 *
 * Closes this module's own connections first — a connection left open here
 * would block the very delete being asked for, which is precisely how the
 * user's own `indexedDB.deleteDatabase('parakeet-cache-db')` came to no-op.
 *
 * `deleted: false` means some *other* connection (another tab, or a browser
 * that has not run this delete before) is still holding the database open, so
 * the files are still there. The caller resets the registry regardless: with or
 * without the bytes, the model is no longer ready, and an entry that still
 * claims otherwise is the thing that makes Record look enabled while nothing
 * gets transcribed.
 */
export async function deleteModelCache(): Promise<DeleteModelCacheResult> {
  // This module's own connections first, and without opening anything new to
  // get at them: a connection left open here would block the very delete being
  // asked for, which is exactly how the user's own `deleteDatabase()` in the
  // console came to no-op.
  closeQuietly(cacheDbRef);
  cacheDbRef = null;
  // Drop the memoised promise too, or the next read would hand out a
  // connection to a database that no longer exists.
  cacheDbPromise = null;

  const outcomes = await Promise.all([
    deleteDatabaseWithinDeadline(CACHE_DB_NAME),
    ...LEGACY_DB_NAMES.map((name) => deleteDatabaseWithinDeadline(name)),
  ]);
  return { deleted: outcomes.every((outcome) => outcome === 'deleted') };
}

/**
 * Drop this module's cached connections without touching the data.
 *
 * Distinct from `deleteModelCache()` because closing is the polite half of the
 * job and it always succeeds: a connection left open blocks another tab's (or
 * the user's own) `deleteDatabase`, and IndexedDB has no other way to ask
 * politely.
 */
export function closeModelCacheConnections(): void {
  closeQuietly(cacheDbRef);
  cacheDbRef = null;
  cacheDbPromise = null;
}

/**
 * The cache key for one file.
 *
 * Same shape `parakeet.js`'s `hub.js` used (`hf-<repo>-<revision>--<file>`),
 * which keeps the database readable in DevTools for anyone who has looked
 * before — but it is *our* key now, in *our* database, and nothing outside
 * this module reads or writes it.
 */
function cacheKey(repoId: string, revision: string, filename: string): string {
  return `hf-${repoId}-${revision}--${filename}`;
}

/* ------------------------------------------------------------------ */
/* Cache probing — what is already on disk, for load progress           */
/* ------------------------------------------------------------------ */

/** One file's cache-probe result, reported as the load walks the list. */
export interface CachedFileProbe {
  /** How many files have been probed so far. */
  done: number;
  /** How many files the manifest lists. */
  total: number;
  /** The file just probed. */
  file: string;
  /** Whether it was found complete in IndexedDB. */
  cached: boolean;
}

/** Whether `filename` is already fully downloaded for `repoId`/`revision`. */
async function isModelFileCached(
  repoId: string,
  filename: string,
  revision: string,
): Promise<boolean> {
  try {
    // The `files` record, not the bytes: a probe is "is this here", and now
    // that question is answered by one small record instead of pulling a
    // multi-gigabyte Blob out of the store.
    const record = await getMetaRecord<CachedFileRecord>(
      FILE_STORE,
      cacheKey(repoId, revision, filename),
    );
    return record != null;
  } catch {
    // No IndexedDB (SSR, a locked-down browser, a corrupt store) — the load
    // path fetches from the network instead, so "not cached" is the only
    // honest answer, and it must never be allowed to fail the load.
    return false;
  }
}

/**
 * Walk the manifest's files and report each one, so a caller can show
 * "2/4 files read" while a model is being opened.
 *
 * This is what gives the *initialization* half of "getting the model ready" a
 * real number to show: ORT reports nothing, so without this the model appeared
 * to hang with no measurable progress at all. Deliberately a read-only probe —
 * no fetch, no remote-tree validation, no bytes — because the only question
 * is "are the bytes already here", and a file with a `files` record is one a
 * download already size-validated (see `leadDownload`).
 *
 * A failure to read one file counts as "not cached" rather than aborting the
 * load. No return value: the per-file results are what callers report on, and
 * a total would just be the `cached` flags summed.
 */
export async function probeCachedModelFiles(
  manifest: Pick<AsrModelManifest, 'modelRepo' | 'files'>,
  onProgress?: (probe: CachedFileProbe) => void,
  revision = 'main',
): Promise<void> {
  for (const [index, file] of manifest.files.entries()) {
    const cached = await isModelFileCached(manifest.modelRepo, file, revision);
    onProgress?.({ done: index + 1, total: manifest.files.length, file, cached });
  }
}

/** What `areModelFilesCached` found on disk. */
export interface ModelCacheState {
  /** How many of the manifest's files are complete in the cache. */
  cached: number;
  /** How many the manifest lists (`0` = unknown/unmeasured). */
  total: number;
  /** `cached === total && total > 0` — every file is there. */
  complete: boolean;
}

/**
 * Is the whole model actually on disk?
 *
 * The registry records `cached` in `localStorage`, which is a *claim* about
 * this browser's storage rather than a reading of it, and the claim goes stale
 * in ways that matter: the user clears the database from the console (a
 * supported way to reclaim a multi-gigabyte download), or Safari evicts it
 * under storage pressure. When that happens the claim survives, and it is the
 * claim that decides everything downstream — the entry is filtered out of
 * `initiateDownloads()` (so the Download button genuinely does nothing), the
 * settings panel says "Ready", Record enables… and then the loader, finding no
 * cached bytes, quietly re-fetches the whole model over the network with
 * nothing reporting progress. That is the whole "pressed Download and the
 * dialog closed while the bar sat at 35%" failure.
 *
 * So the bytes get asked about, and the claim gets checked. Four short
 * IndexedDB reads, once per acquisition.
 */
export async function areModelFilesCached(
  manifest: Pick<AsrModelManifest, 'modelRepo' | 'files'>,
  revision = 'main',
): Promise<ModelCacheState> {
  let cached = 0;
  for (const file of manifest.files) {
    if (await isModelFileCached(manifest.modelRepo, file, revision)) cached += 1;
  }
  const total = manifest.files.length;
  return { cached, total, complete: total > 0 && cached === total };
}

/* ------------------------------------------------------------------ */
/* Cross-tab coordination                                               */
/*                                                                      */
/* One tab (the "leader") actually fetches; every tab (leader and       */
/* followers alike) sees live progress and the final result, so two      */
/* tabs never download the same multi-gigabyte file twice.              */
/* ------------------------------------------------------------------ */

type BroadcastMsg =
  | { type: 'progress'; key: string; loaded: number; total: number }
  | { type: 'done'; key: string }
  | { type: 'failed'; key: string; message: string };

const CHANNEL_NAME = 'mn-model-download';

function openChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Aborting in-flight downloads — the "Cancel download and delete" path */
/*                                                                      */
/* "Delete downloaded models" used to be disabled mid-download, which is */
/* exactly when a stuck download needs it most. It is enabled now, so a  */
/* click has to stop what is running first: the stall watchdog only      */
/* watches, it never cancels on behalf of the user.                     */
/* ------------------------------------------------------------------ */

/**
 * `AbortSignal.reason` carried by a user-requested cancel.
 *
 * Distinct from the watchdog's bare `abort()`: a cancel must surface as
 * "cancelled" (the entry goes back to a state a retry can leave), never as
 * a stall or a size failure.
 */
export const DOWNLOAD_CANCEL_REASON = 'mn-user-cancel';

/** Every leader download's abort handle that is live right now. */
const activeDownloadAborters = new Set<AbortController>();
/** Every leader download's live body reader, once its response has arrived. */
const activeDownloadReaders = new Set<ReadableStreamDefaultReader<Uint8Array>>();
/** Every follower-tab wait, each settled when a cancel arrives. */
const activeFollowerCancels = new Set<() => void>();
/**
 * Incremented by every `abortInFlightDownloads()` call.
 *
 * The signal reason alone is not enough: cancelling a reader resolves its
 * pending read as done rather than rejecting it, so a download woken that
 * way sees a short file, not an aborted signal — the generation is what
 * tells it the shortfall was requested.
 */
let downloadAbortGeneration = 0;

/**
 * Stop every download this module currently has in flight: followers waiting
 * on another tab, leaders fetching, and the stall watchdogs guarding them
 * (each leader settles through its `finally`, which clears its timer).
 */
export function abortInFlightDownloads(): void {
  downloadAbortGeneration += 1;
  for (const cancel of [...activeFollowerCancels]) {
    try {
      cancel();
    } catch {
      // Settling twice is fine.
    }
  }
  for (const reader of [...activeDownloadReaders]) {
    try {
      reader.cancel(DOWNLOAD_CANCEL_REASON).catch(() => {});
    } catch {
      // Already closed — the abort below is what ends it.
    }
  }
  for (const aborter of [...activeDownloadAborters]) {
    try {
      aborter.abort(DOWNLOAD_CANCEL_REASON);
    } catch {
      // Settling twice is fine.
    }
  }
}

/** Whether a cancel was requested after `generation` was captured. */
function wasCancelRequested(aborter: AbortController, generation: number): boolean {
  return aborter.signal.reason === DOWNLOAD_CANCEL_REASON || downloadAbortGeneration !== generation;
}

function downloadCancelError(filename: string): Error {
  return new DOMException(
    `Download of ${filename} cancelled.`,
    'AbortError',
  ) as unknown as Error;
}

/** Whether `err` is a user-requested cancel rather than a failure. */
export function isDownloadCancelled(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

/**
 * Run `fn(isLeader)` with cross-tab exclusivity for `lockKey`. Prefers the
 * Web Locks API (Safari 15.4+, all evergreen browsers); when it isn't
 * available, falls back to a short heartbeat handshake over
 * `BroadcastChannel` — best-effort, but the common case (two tabs opened at
 * roughly the same time) is exactly what it's designed to catch.
 */
async function withDownloadLock<T>(lockKey: string, fn: (isLeader: boolean) => Promise<T>): Promise<T> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && 'locks' in nav && nav.locks) {
    let outcome!: T;
    await nav.locks.request(`mn-model-dl:${lockKey}`, { ifAvailable: true }, async (lock) => {
      outcome = await fn(lock !== null);
    });
    return outcome;
  }

  const channel = openChannel();
  if (!channel) return fn(true); // No coordination primitive available at all — best effort.

  const HEARTBEAT_MS = 1000;
  const WAIT_MS = 350;
  let sawOther = false;
  const heartbeatListener = (ev: MessageEvent<{ type: string; key: string }>) => {
    if (ev.data?.type === 'heartbeat' && ev.data.key === lockKey) sawOther = true;
  };
  channel.addEventListener('message', heartbeatListener);
  await new Promise((r) => setTimeout(r, WAIT_MS));
  channel.removeEventListener('message', heartbeatListener);

  const isLeader = !sawOther;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  if (isLeader) {
    heartbeatTimer = setInterval(
      () => channel.postMessage({ type: 'heartbeat', key: lockKey }),
      HEARTBEAT_MS,
    );
  }
  try {
    return await fn(isLeader);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    channel.close();
  }
}

/* ------------------------------------------------------------------ */
/* Per-file resumable download                                         */
/* ------------------------------------------------------------------ */

export interface DownloadProgress {
  loaded: number;
  total: number;
  file: string;
  /** True while resume/lock/setup is happening, before real bytes flow. */
  resuming: boolean;
}

export interface DownloadFileOptions {
  onProgress?: (p: DownloadProgress) => void;
  /**
   * Called when the bytes arrived but could not be written to the cache.
   *
   * Non-fatal by construction: the download still succeeds and the caller
   * still gets its bytes, because a cache is an optimisation and losing one
   * costs a re-download, not a broken model. The message is the "will be
   * downloaded again next time" notice the UI shows.
   */
  onCacheWarning?: (message: string) => void;
  /**
   * Fetch from this URL instead of the Hugging Face repo — for manifest
   * files no public repo ships (see `fileUrlOverrides` in
   * `model-manifest.ts`). The cache key stays `(repoId, revision,
   * filename)`, so resume/validation/probing are unchanged; only the origin
   * differs. Resume still works wherever the override origin honours
   * `Range` (and degrades to a fresh fetch where it does not — see
   * `leadDownload`).
   */
  urlOverride?: string;
}

/** A file's expected size from an origin the HF tree knows nothing about. */
async function headFileMeta(url: string): Promise<{ size: number; sha256: null }> {
  const head = await fetch(url, { method: 'HEAD' });
  if (!head.ok) {
    throw new Error(`HEAD ${head.status} ${head.statusText} (${url})`);
  }
  const size = Number(head.headers.get('content-length') ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`no usable content-length (${url})`);
  }
  // No hash: the HF tree's LFS oid is what `meta.sha256` usually carries,
  // and an override origin has no equivalent. Files large enough to need an
  // override skip hash verification anyway (see `shouldVerifyHash`).
  return { size, sha256: null };
}

function resolveFileUrl(repoId: string, filename: string, revision: string): string {
  const encodedRepo = repoId.split('/').map(encodeURIComponent).join('/');
  const encodedFile = filename.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/${encodedRepo}/resolve/${encodeURIComponent(revision)}/${encodedFile}`;
}

/**
 * Download (or resume, or reuse from cache) one HF file. Returns a `blob:`
 * URL, same contract as `parakeet.js`'s own `getModelFile`.
 */
export function downloadHfFileResumable(
  repoId: string,
  filename: string,
  revision = 'main',
  options: DownloadFileOptions = {},
): Promise<string> {
  return acquireHfFile(repoId, filename, revision, options, true).then((url) => {
    if (url === null) {
      // `wantBytes: true` always produces a URL; a null here would mean the
      // cache lost a file it had just written, and the honest answer is a
      // failed call rather than a null the caller would dereference.
      throw new Error(`Failed to obtain ${filename} for ${repoId}.`);
    }
    return url;
  });
}

/**
 * Make sure one HF file is in the cache, without asking for its bytes.
 *
 * This is the *download* half of the flow (the Download button, the resume on
 * page load) and the distinction is the whole point: warming the cache for the
 * 2.44 GB encoder does not need a 2.44 GB Blob built and immediately revoked
 * in memory, and it does not need the file held in the JS heap while it
 * arrives. `downloadHfFileResumable` keeps the bytes for callers that hand
 * them straight to ONNX Runtime; this one does not.
 */
export function ensureHfFileCached(
  repoId: string,
  filename: string,
  revision = 'main',
  options: DownloadFileOptions = {},
): Promise<void> {
  return acquireHfFile(repoId, filename, revision, options, false).then(() => undefined);
}

/**
 * The shared body of both entry points.
 *
 * `wantBytes` decides only what the caller gets back, never whether the file
 * is validated and cached.
 */
async function acquireHfFile(
  repoId: string,
  filename: string,
  revision: string,
  options: DownloadFileOptions,
  wantBytes: boolean,
): Promise<string | null> {
  const { onProgress } = options;
  const key = cacheKey(repoId, revision, filename);
  // Captured before the first await: a cancel that arrives while the lock,
  // the tree lookup or the cache read is pending bumps the generation, and a
  // capture taken after them would never see it.
  const abortGeneration = downloadAbortGeneration;
  const channel = openChannel();

  try {
    return await withDownloadLock(key, async (isLeader) => {
      // Always check the complete-file cache first, leader or not — no
      // network round trip needed if it's already there and valid. Override
      // files have no HF tree entry, so their expected size comes from a
      // HEAD against the override origin instead; when even that fails
      // (offline), a complete cache record still serves — it was
      // size-checked at commit time and `readCachedFile` re-verifies chunks
      // against the record before serving.
      const meta =
        (await getRepoFileMeta(repoId, revision, filename)) ??
        (options.urlOverride ? await headFileMeta(options.urlOverride).catch(() => null) : null);
      const cached = await readCachedFile(key).catch(() => null);
      if (cached && (!meta || isSizeValid(cached.record.size, meta.size))) {
        const total = meta?.size ?? cached.record.size;
        onProgress?.({ loaded: total, total, file: filename, resuming: false });
        return wantBytes ? blobUrlFor(cached.parts) : null;
      }

      if (downloadAbortGeneration !== abortGeneration) {
        throw downloadCancelError(filename);
      }

      if (!isLeader) {
        return await followDownload(key, channel, filename, wantBytes, onProgress);
      }

      try {
        const fileUrl = await leadDownload({
          repoId,
          filename,
          revision,
          key,
          meta,
          wantBytes,
          onProgress,
          onCacheWarning: options.onCacheWarning,
          urlOverride: options.urlOverride,
          abortGeneration,
        });
        channel?.postMessage({ type: 'done', key } satisfies BroadcastMsg);
        return fileUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        channel?.postMessage({ type: 'failed', key, message } satisfies BroadcastMsg);
        throw err;
      }
    });
  } finally {
    channel?.close();
  }
}

/** Follower path: another tab is downloading this file — mirror its
 *  progress and resolve once it finishes (or reject once it fails). */
function followDownload(
  key: string,
  channel: BroadcastChannel | null,
  filename: string,
  wantBytes: boolean,
  onProgress?: (p: DownloadProgress) => void,
): Promise<string | null> {
  onProgress?.({ loaded: 0, total: 0, file: filename, resuming: true });

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      activeFollowerCancels.delete(cancelFollower);
      channel?.removeEventListener('message', onMessage);
      fn();
    };
    // A cancel from this tab settles the wait as cancelled rather than
    // leaving the poll below to run until the completion it will never see.
    // Referenced by `finish` above; only ever invoked asynchronously, after
    // this is initialised.
    const cancelFollower = () => finish(() => reject(downloadCancelError(filename)));
    activeFollowerCancels.add(cancelFollower);
    // Read the bytes the leader left behind, once. The poll below only asks
    // whether they are there (a small record read) — re-reading a 2.44 GB file
    // every two seconds "just in case" would be a second download's worth of
    // work by the tab that was only meant to be watching.
    const takeResult = (): void => {
      if (!wantBytes) {
        finish(() => resolve(null));
        return;
      }
      readCachedFile(key).then((file) => {
        if (file) finish(() => resolve(blobUrlFor(file.parts)));
        else reject(new Error(`Download of ${filename} finished in another tab but the result was not found.`));
      }, reject);
    };

    const onMessage = (ev: MessageEvent<BroadcastMsg>) => {
      const msg = ev.data;
      if (!msg || msg.key !== key) return;
      if (msg.type === 'progress') {
        onProgress?.({ loaded: msg.loaded, total: msg.total, file: filename, resuming: false });
      } else if (msg.type === 'done') {
        // The leader says it committed; read what it left behind, once.
        takeResult();
      } else if (msg.type === 'failed') {
        finish(() => reject(new Error(msg.message)));
      }
    };
    channel?.addEventListener('message', onMessage);

    // Belt-and-suspenders in case the "done" broadcast is missed (e.g. this
    // tab was asleep/throttled): poll for the completed file's record.
    const pollTimer = setInterval(() => {
      isModelFileCachedByKey(key).then((done) => {
        if (done) takeResult();
      }, () => {});
    }, 2000);
  });
}

/**
 * Streams one file into the cache as `ArrayBuffer` chunks.
 *
 * The whole reason this is a class and not a `BlobPart[]` array: a download
 * must not have to fit in the JS heap. Bytes are copied into one reusable
 * `CACHE_CHUNK_BYTES` buffer and handed to IndexedDB as soon as that buffer
 * fills (or at a flush point, so a refresh can resume), then the buffer is
 * reused. The 2.44 GB external-data blob therefore costs `CACHE_CHUNK_BYTES`
 * of heap to download rather than 2.44 GB — on the tab that already had to be
 * kept alive by `17adfc3`.
 *
 * `retain` is the one thing that opts out: when the caller needs the whole
 * file as bytes (to hand ONNX Runtime a `blob:` URL) the chunks are
 * additionally kept in `retained`, because the bytes have to outlive a cache
 * write that is allowed to fail. Hashing does *not* opt out: the checksum is
 * accumulated by the streaming `Sha256` as the bytes arrive, so verifying a
 * file costs no assembly of it at all — retaining a ≤200 MB file just to hash
 * it would hold a second full copy for no consumer. A file that is merely
 * being cached keeps nothing.
 */
class ChunkWriter {
  /** The chunk being filled. Allocated on demand, reused after every seal. */
  private buffer: ChunkBytes | null = null;
  /** How much of `buffer` is used. */
  private fill = 0;
  /** How many leading chunks are complete and written. */
  private sealedChunks = 0;
  /** Length of the tail as last written to the store; `-1` = not written. */
  private storedTailLength = -1;
  private loadedBytes = 0;
  private readonly retained: ChunkBytes[] | null;
  /**
   * Whether every byte handed to the store actually got there.
   *
   * The `files` record is a promise that all of this file's chunks are on
   * disk, so it may only be written while this is true. A record written over
   * a refused write is the stale-claim bug in miniature: the probe says
   * "cached", the load asks for the bytes, finds a hole, and re-downloads a
   * model that was already there.
   */
  private bytesStored = true;
  /** The tail has been folded into the hasher; see `checksum()`. */
  private checksumFinalized = false;

  constructor(
    private readonly key: string,
    private readonly totalBytes: number,
    private readonly etag: string | null,
    retain: boolean,
    private readonly onWriteFailure: (detail: string) => void,
    /** Present when this file's checksum is being verified as it arrives. */
    private readonly hasher: Sha256 | null = null,
  ) {
    this.retained = retain ? [] : null;
  }

  /**
   * The checksum of the whole file, or `null` when it is not being hashed.
   *
   * Computed *as the bytes arrive* rather than over an assembled copy of the
   * file at the end. `crypto.subtle.digest` needs one contiguous buffer, and
   * building one means a second full copy of the file on the tab that has
   * already died once from an allocation that size — plus a pause at the end of
   * the download, on the step that decides whether the file is allowed into
   * the cache at all.
   *
   * Every *sealed* chunk is hashed as it is written. The short final chunk is
   * not: it is still being appended to, so it is hashed here, once, at the end
   * — which is the bug `resumable-download.hash.test.ts` exists for. A file
   * whose size is not a whole multiple of `CACHE_CHUNK_BYTES` (every file of
   * the WebGPU manifest) is exactly the case that gets it wrong.
   *
   * Idempotent, because the caller may reasonably ask twice.
   */
  checksum(): string | null {
    if (!this.hasher) return null;
    if (!this.checksumFinalized) {
      if (this.fill > 0) this.hasher.update((this.buffer as ChunkBytes).subarray(0, this.fill));
      this.checksumFinalized = true;
    }
    return this.hasher.digest();
  }

  /** Bytes stored so far — the number the Range request resumes from. */
  get loaded(): number {
    return this.loadedBytes;
  }

  /** How many `chunks` records the file currently occupies. */
  get chunkCount(): number {
    return this.sealedChunks + (this.fill > 0 ? 1 : 0);
  }

  /**
   * Every byte of the file, in order, when `retain` was set.
   *
   * The tail is included *here* rather than being pushed onto the retained list
   * at commit time, and that ordering is load-bearing: this list is what the
   * `blob:` URL is built from, and it is built before the commit. A list that
   * only held the sealed chunks is a file missing its last up-to-16-MiB tail —
   * for the 41.7 MB encoder graph, a truncated model handed to ONNX Runtime.
   *
   * The checksum does *not* come from here: it is accumulated as the bytes
   * arrive (see `checksum()`), so verifying a file costs no assembly of it at
   * all. The tail has to be counted in both places, separately, which is
   * precisely the trap `resumable-download.hash.test.ts` is built around.
   */
  completeParts(): ChunkBytes[] {
    if (!this.retained) return [];
    return this.fill > 0 ? [...this.retained, this.tailCopy()] : [...this.retained];
  }

  /**
   * One cache write, never fatal.
   *
   * A rejected `put` here is the reported Safari failure
   * ("Error preparing Blob/File data to be stored in object store") in the
   * one shape this rewrite cannot have — but a quota error or a corrupted
   * store produces the same thing, and neither is a reason to fail a
   * download that has all the bytes. Reported, counted, and stepped over.
   */
  private async safely(what: string, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (err) {
      this.onWriteFailure(`${what} (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  /** One `chunks` record — the only write whose failure loses bytes. */
  private async writeChunk(index: number, bytes: ChunkBytes): Promise<void> {
    try {
      await putChunk(this.key, index, bytes);
    } catch (err) {
      this.bytesStored = false;
      this.onWriteFailure(
        `Writing a chunk to the model cache (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }

  async append(bytes: Uint8Array): Promise<void> {
    let offset = 0;
    while (offset < bytes.length) {
      if (this.buffer === null) this.buffer = new Uint8Array(CACHE_CHUNK_BYTES);
      const take = Math.min(CACHE_CHUNK_BYTES - this.fill, bytes.length - offset);
      this.buffer.set(bytes.subarray(offset, offset + take), this.fill);
      this.fill += take;
      this.loadedBytes += take;
      offset += take;
      if (this.fill === CACHE_CHUNK_BYTES) await this.seal();
    }
  }

  private async seal(): Promise<void> {
    const chunk = this.buffer as ChunkBytes;
    this.hasher?.update(chunk);
    this.retained?.push(chunk);
    this.sealedChunks += 1;
    this.fill = 0;
    this.buffer = null;
    this.storedTailLength = -1;
    await this.writeChunk(this.sealedChunks - 1, chunk);
  }

  private partialRecord(): PartialFileRecord {
    return {
      loadedBytes: this.loadedBytes,
      totalBytes: this.totalBytes,
      etag: this.etag,
      sealedChunks: this.sealedChunks,
      updatedAt: Date.now(),
    };
  }

  /**
   * Persist the tail and the resume bookkeeping.
   *
   * The tail is the record a *resumed* download continues appending to, so it
   * is rewritten whenever it has grown; the record is written every time
   * because it, not the chunk, is what a resume trusts. It is written
   * *after* the chunk it describes, so a crash in between costs a few bytes of
   * progress rather than a corrupt splice.
   */
  async flushPartial(): Promise<void> {
    if (this.fill > 0 && this.fill !== this.storedTailLength) {
      await this.writeChunk(this.sealedChunks, (this.buffer as ChunkBytes).subarray(0, this.fill));
      this.storedTailLength = this.fill;
    }
    await this.safely('Recording resume progress', () =>
      putMetaRecord(PARTIAL_STORE, this.key, this.partialRecord()),
    );
  }

  /**
   * Adopt a previous attempt's stored chunks.
   *
   * `false` means the record and the store disagree — a partial that cannot
   * be trusted — and the caller has to start over. The checks are not
   * paranoia: the tail is rewritten in place as it grows, so a crash between
   * a chunk write and its record update leaves the store *ahead* of the
   * record, and resuming from the wrong length would splice a file together
   * from two different offsets. A sealed chunk is immutable once written, so
   * any of them not being exactly full means the record is describing bytes
   * that were never stored.
   */
  async resumeFrom(record: PartialFileRecord): Promise<boolean> {
    const sealed = record.sealedChunks;
    const tailLength = record.loadedBytes - sealed * CACHE_CHUNK_BYTES;
    if (!Number.isInteger(sealed) || sealed < 0) return false;
    if (!Number.isInteger(tailLength) || tailLength < 0 || tailLength >= CACHE_CHUNK_BYTES) return false;

    if (this.retained) {
      const prefix = await getChunks(this.key, sealed);
      // Every sealed chunk must be present *and* full, or the byte list this
      // resume would hash and hand to ONNX Runtime has a hole in it.
      if (prefix.length !== sealed) return false;
      if (prefix.some((part) => part.byteLength !== CACHE_CHUNK_BYTES)) return false;
      this.retained.push(...prefix);
      // The checksum is computed as bytes arrive, and this attempt only sees
      // the bytes that arrive *after* this point — so the stored prefix has to
      // go through the hasher too, in order, or a resumed file would be
      // verified against a digest of its own last chunk. It is the same bytes
      // that were already read for the retained list, so it costs one pass
      // over a prefix that was read anyway.
      for (const part of prefix) this.hasher?.update(part);
    }
    if (tailLength > 0) {
      const tail = await getChunk(this.key, sealed);
      // Only the first `tailLength` bytes are ours: the store may hold a
      // longer tail from a flush that did not survive, and everything past the
      // recorded length is overwritten by this attempt.
      if (!tail || tail.byteLength < tailLength) return false;
      this.buffer = new Uint8Array(CACHE_CHUNK_BYTES);
      this.buffer.set(tail.subarray(0, tailLength));
      this.fill = tailLength;
      // The restored tail is deliberately *not* hashed here: it is the front of
      // the chunk that is still growing, and it gets hashed exactly once —
      // when that chunk is sealed, or by `checksum()` if the file ends first.
    }
    this.sealedChunks = sealed;
    this.loadedBytes = record.loadedBytes;
    this.storedTailLength = -1;
    return true;
  }

  /** Throw the file away and start over (stale partial, or a full 200). */
  async reset(): Promise<void> {
    await this.safely('Clearing a stale partial download', () => deleteCachedFile(this.key));
    this.buffer = null;
    this.fill = 0;
    this.sealedChunks = 0;
    this.storedTailLength = -1;
    this.loadedBytes = 0;
    if (this.retained) this.retained.length = 0;
    // The hasher holds bytes that are no longer part of any file — after a
    // discard, or after a resume that was rejected. Starting from there would
    // verify a completely different file than the one downloaded.
    this.hasher?.reset();
    this.checksumFinalized = false;
  }

  /**
   * Commit the file: the tail, then the leftover trim, then — last and only
   * last — the record that makes the file count as cached.
   *
   * The ordering is the completeness guarantee. A reader only ever believes a
   * `files` record, and it is written after every chunk has committed, so an
   * interrupted commit leaves chunks nobody will read rather than a record
   * promising bytes that are not there.
   */
  async commit(): Promise<void> {
    if (this.fill > 0 && this.fill !== this.storedTailLength) {
      await this.writeChunk(this.sealedChunks, (this.buffer as ChunkBytes).subarray(0, this.fill));
      this.storedTailLength = this.fill;
    }
    if (!this.bytesStored) {
      // The download itself succeeded — the caller has its bytes — but the
      // cache does not, so the file must read as absent. No `files` record, no
      // resume record, and no record left over from an earlier attempt under
      // this key either.
      await this.safely('Clearing the cached-file record for a file that was not stored', () =>
        deleteMetaRecord(FILE_STORE, this.key),
      );
      await this.safely('Clearing the resume record', () => deleteMetaRecord(PARTIAL_STORE, this.key));
      return;
    }
    // A previous attempt may have left *more* chunks under this key than this
    // one has (the file changed upstream, or a longer partial was abandoned).
    await this.safely('Trimming stale chunks', () => deleteChunksFrom(this.key, this.chunkCount));
    await this.safely('Recording the file as cached', () =>
      putMetaRecord(FILE_STORE, this.key, {
        size: this.loadedBytes,
        chunkCount: this.chunkCount,
        updatedAt: Date.now(),
      } satisfies CachedFileRecord),
    );
    await this.safely('Clearing the resume record', () => deleteMetaRecord(PARTIAL_STORE, this.key));
  }

  /**
   * Drop every reference to the file's bytes.
   *
   * Call once the caller holds its `blob:` URL: the Blob owns the bytes from
   * there on, and every buffer still pointed at from here (the retained list,
   * the half-filled chunk) would otherwise keep a second full-size copy of
   * the file alive until the GC gets around to this writer — which, for a
   * 2.44 GB file about to be read a second time by ONNX Runtime's own fetch,
   * is the allocation peak a Safari WebContent process dies on. Releasing
   * here is what keeps the deterministic peak at one full copy plus ORT's
   * own, instead of one plus whatever the collector hasn't run yet.
   *
   * Only valid after the checksum has been taken and the URL built: the
   * retained list is what both are built from.
   */
  release(): void {
    if (this.retained) this.retained.length = 0;
    this.buffer = null;
    this.fill = 0;
    this.storedTailLength = -1;
  }

  /** An exact-size copy of the tail, for the retained byte list. */
  private tailCopy(): ChunkBytes {
    return (this.buffer as ChunkBytes).slice(0, this.fill);
  }
}

interface LeadContext {
  repoId: string;
  filename: string;
  revision: string;
  key: string;
  meta: { size: number; sha256: string | null } | null;
  wantBytes: boolean;
  onProgress?: (p: DownloadProgress) => void;
  onCacheWarning?: (message: string) => void;
  urlOverride?: string;
  /** `downloadAbortGeneration` when the caller started; see `acquireHfFile`. */
  abortGeneration: number;
}

/** Leader path: actually perform the (possibly resumed) network fetch. */
async function leadDownload(ctx: LeadContext): Promise<string | null> {
  const { repoId, filename, revision, key, meta, wantBytes, onProgress } = ctx;
  // `meta` comes from the HF tree, which knows nothing about override
  // files — for those the HEAD below is the *only* size source, and the
  // hash check is skipped (same as any HF file without an LFS hash).
  const url = ctx.urlOverride ?? resolveFileUrl(repoId, filename, revision);
  const channel = openChannel();

  // One notice per file, not one per failed write: a 2.44 GB file is ~150
  // chunks and a quota error would otherwise produce 150 identical lines. The
  // first is logged with its cause, the rest are counted into it.
  let cacheFailures = 0;
  const onWriteFailure = (detail: string) => {
    cacheFailures += 1;
    if (cacheFailures > 1) return;
    console.error(
      `[resumable-download] Could not write "${filename}" to the model cache: ${detail}. ` +
        'The download continues; the model will be downloaded again next time it is needed.',
    );
  };

  // The stall watchdog's abort handle, created before the first request so no
  // request — the HEAD included — can outlive the timer that guards it, and so
  // a cancel that lands during the HEAD or the resume-record reads aborts this
  // download instead of being missed. Aborted either by the watchdog below (a
  // stall) or by `abortInFlightDownloads()` (the user cancelling) —
  // `wasCancelRequested` tells the two apart, so a cancel surfaces as
  // cancelled, never as a stall. The generation is the caller's, captured
  // before its own awaits, so a cancel during those is seen here too.
  const aborter = new AbortController();
  const { abortGeneration } = ctx;
  activeDownloadAborters.add(aborter);
  // The live body reader, once the response arrives — null while the request
  // itself is still in flight. The watchdog below cancels it on firing, so a
  // stalled stream stops streaming into a writer nobody awaits.
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  // Stall watchdog for the whole fetch path: the HEAD, the resume-record
  // reads, the GET and the body loop are the steps in the download that can
  // take unbounded time *and* report nothing — an origin that never answers,
  // a stalled HTTP/2 stream, or an IndexedDB transaction WebKit never
  // completes all leave the promise never settling, and `initiateDownloads()`
  // never returns, so the registry stays `downloading` on its last percentage
  // forever. Every step and every chunk re-arms the timer, so a
  // slow-but-moving multi-gigabyte transfer is never cut off; only silence is
  // a failure. On firing, the reader is cancelled and the request aborted
  // first, and the throw turns the hang into a stated, resumable error
  // instead of a frozen bar.
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let stallFired = false;
  const clearStallTimer = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };
  const armStallTimer = () => {
    clearStallTimer();
    stallTimer = setTimeout(() => {
      stallFired = true;
      if (reader) {
        reader.cancel().catch(() => {
          // Already closed — the abort below is what ends it.
        });
      }
      try {
        aborter.abort();
      } catch {
        // Settling twice is fine.
      }
    }, DOWNLOAD_STALL_MS);
    unrefTimer(stallTimer);
  };
  // The user cancel first, then the stall: see `wasCancelRequested`.
  const throwIfStopped = () => {
    if (wasCancelRequested(aborter, abortGeneration)) {
      throw downloadCancelError(filename);
    }
    if (stallFired || aborter.signal.aborted) {
      throw new Error(describeDownloadStall(filename, DOWNLOAD_STALL_MS));
    }
  };
  // A request that rejected because it was aborted is reported as the cancel
  // or stall that aborted it, not as the bare fetch error.
  const rethrowStopped = (err: unknown): never => {
    throwIfStopped();
    throw err;
  };

  let totalBytes: number;
  let startByte = 0;
  let resuming = false;
  let verifyHash: boolean;
  let writer: ChunkWriter;

  try {
    armStallTimer();
    // HEAD first: gives us Content-Length/ETag without paying for the body,
    // and follows the HF -> CDN redirect the same way the real GET will.
    const head = await fetch(url, { method: 'HEAD', signal: aborter.signal }).catch(rethrowStopped);
    throwIfStopped();
    if (!head.ok) {
      throw new Error(`Failed to download ${filename}: ${head.status} ${head.statusText} (${url})`);
    }
    totalBytes = meta?.size ?? Number(head.headers.get('content-length') ?? 0);
    // `x-linked-etag` first where the header exists: on the HF -> CDN redirect it
    // is the file's sha256, which is the same value the checksum check uses,
    // while the plain `ETag` is a different, content-addressing hash of the CDN's
    // own making. Both are stable across requests, so either works as a resume
    // token — this just makes the token mean the same thing as the checksum.
    const etag = head.headers.get('x-linked-etag') ?? head.headers.get('etag');

    // The bytes are kept in memory only when somebody actually needs them: to
    // build the `blob:` URL this caller asked for. Hashing is not such a need —
    // the checksum is accumulated incrementally by the streaming `Sha256` as
    // the bytes arrive (see `ChunkWriter.checksum()`), so retaining a file just
    // to verify it would hold a full copy with no consumer. A multi-gigabyte
    // download that is only being cached therefore costs one 16 MiB buffer,
    // never the file.
    verifyHash = Boolean(meta?.sha256) && shouldVerifyHash(totalBytes);
    writer = new ChunkWriter(
      key,
      totalBytes,
      etag,
      /* retain */ wantBytes,
      onWriteFailure,
      verifyHash ? new Sha256() : null,
    );

    armStallTimer();
    const existingPartial = await getMetaRecord<PartialFileRecord>(PARTIAL_STORE, key).catch(() => undefined);
    throwIfStopped();
    const decision = decideResume(
      existingPartial
        ? {
            loadedBytes: existingPartial.loadedBytes,
            totalBytes: existingPartial.totalBytes,
            etag: existingPartial.etag,
          }
        : null,
      { totalBytes, etag },
    );

    armStallTimer();
    if (decision === 'resume' && existingPartial && (await writer.resumeFrom(existingPartial))) {
      throwIfStopped();
      startByte = existingPartial.loadedBytes;
      resuming = true;
      // Tell the UI this is a resume, not a fresh start, before the Range
      // request (which can take a moment to establish) actually lands —
      // "Resuming…" rather than a progress bar frozen at the pre-refresh
      // percentage until the first new byte arrives.
      onProgress?.({ loaded: startByte, total: totalBytes, file: filename, resuming: true });
    } else {
      throwIfStopped();
      // Stale partial (file changed upstream, or corrupt bookkeeping) — drop it.
      if (existingPartial) await writer.reset();
      else await deleteCachedFile(key).catch(() => {});
      throwIfStopped();
    }

    armStallTimer();
    const res = await fetch(
      url,
      {
        ...(startByte > 0 ? { headers: { Range: `bytes=${startByte}-` } } : {}),
        // Owned by the stall watchdog and by `abortInFlightDownloads()`: see
        // `wasCancelRequested` for how the two aborts are told apart.
        signal: aborter.signal,
      },
    ).catch(rethrowStopped);
    if (!res.ok && res.status !== 206) {
      throw new Error(`Failed to download ${filename}: ${res.status} ${res.statusText} (${url})`);
    }
    // The server can legally ignore a Range request and send the whole file
    // (200) instead of a partial one (206) — when that happens, treat it as a
    // fresh download from byte zero rather than splicing the old partial onto
    // the front of a full response.
    if (res.status !== 206 && startByte > 0) {
      await writer.reset();
      resuming = false;
    }

    if (!res.body) throw new Error(`Failed to download ${filename}: response had no body (${url})`);
    reader = res.body.getReader();
    activeDownloadReaders.add(reader);
    let lastPersist = Date.now();
    const PERSIST_INTERVAL_MS = 3000;
    // Other tabs only draw a progress bar from these, so one post per fetch
    // chunk (tens of thousands for the 2.44 GB encoder) buys nothing but
    // structured-clone work on every listening tab. The last byte always posts.
    let lastBroadcast = 0;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        armStallTimer();
        await writer.append(value);

        onProgress?.({ loaded: writer.loaded, total: totalBytes, file: filename, resuming: false });
        const now = Date.now();
        if (now - lastBroadcast >= PROGRESS_BROADCAST_INTERVAL_MS || writer.loaded >= totalBytes) {
          lastBroadcast = now;
          channel?.postMessage({ type: 'progress', key, loaded: writer.loaded, total: totalBytes } satisfies BroadcastMsg);
        }

        if (now - lastPersist > PERSIST_INTERVAL_MS) {
          lastPersist = now;
          await writer.flushPartial();
        }
      }
    } catch (err) {
      throwIfStopped();
      // The connection dropped (or the tab is closing) mid-stream — save
      // whatever arrived since the last periodic persist so the *next*
      // attempt resumes from here instead of from the last multi-second
      // checkpoint (or from zero, if none was ever reached).
      if (writer.loaded > (resuming ? startByte : 0)) {
        await writer.flushPartial().catch(() => {
          // Best-effort — if this also fails, the next attempt just resumes
          // from the last successful checkpoint (or restarts).
        });
      }
      throw err;
    }
  } finally {
    clearStallTimer();
    activeDownloadAborters.delete(aborter);
    if (reader) activeDownloadReaders.delete(reader);
    channel?.close();
  }

  // A cancelled stream resolves its pending read as done rather than
  // rejecting it — whether the cancel came from the watchdog or from the
  // user — so the stall has to be checked here too, and the user cancel
  // first, otherwise a cancel would surface as a short file instead of as
  // the cancel it was.
  throwIfStopped();

  // Never mark a half-written file done: the byte count has to match what
  // the server told us to expect. This reads the counter, not a Blob — the
  // bytes themselves are in the store, and the file never had to be in
  // memory to be checked.
  if (!isSizeValid(writer.loaded, totalBytes)) {
    throw new Error(
      `Failed to download ${filename}: got ${writer.loaded} bytes, expected ${totalBytes} — refusing to cache a short file (${url})`,
    );
  }

  if (verifyHash && meta?.sha256) {
    const hex = writer.checksum();
    if (hex !== meta.sha256) {
      // The only way a resumed file can hash wrong is a splice that was never
      // supposed to happen, and the cure for that is the file we no longer
      // trust: throw the partial away and take the whole thing again, from
      // byte zero. One retry, not a loop — a second mismatch on a from-scratch
      // download is a genuine checksum problem (a corrupted transfer, or the
      // remote file moving under a `main` revision) and has to surface.
      if (resuming) {
        console.warn(
          `[resumable-download] Resumed "${filename}" (${revision}) did not match its checksum; ` +
            'discarding the partial download and fetching it again from the start.',
        );
        await writer.reset();
        return leadDownload(ctx);
      }
      throw new Error(
        `Failed to download ${filename}: checksum mismatch — refusing to cache a corrupt file. ` +
          `A from-scratch download that does not match means the bytes were corrupted in ` +
          `transit, or "${revision}" moved while it was being fetched (${url})`,
      );
    }
  }

  // A delete that landed while the checksum was taken must not be undone by
  // committing the file it just deleted.
  if (wasCancelRequested(aborter, abortGeneration)) {
    throw downloadCancelError(filename);
  }
  await writer.commit();

  if (cacheFailures > 0) {
    // Non-fatal, and said out loud: the model works, it just is not on disk,
    // and pretending otherwise is the stale-claim bug in a new costume.
    ctx.onCacheWarning?.(
      `The model downloaded, but this browser could not store it (${cacheFailures} cache ` +
        'write(s) failed). It will be downloaded again the next time it is needed.',
    );
  }

  if (!wantBytes) {
    // Nothing else to release: this path deliberately never held the file.
    return null;
  }
  const parts = writer.completeParts();
  const fileUrl = blobUrlFor(parts);
  // The Blob owns the bytes from here on. Release the writer's references
  // now — not at GC time — so the peak while ONNX Runtime reads the URL back
  // is the Blob alone (see `ChunkWriter.release`).
  writer.release();
  return fileUrl;
}

/* ------------------------------------------------------------------ */
/* Whole-model orchestration                                            */
/* ------------------------------------------------------------------ */

export interface ModelDownloadProgress {
  loaded: number;
  total: number;
  file: string;
  resuming: boolean;
}

/**
 * Download every file in a manifest (resumable, cross-tab-coordinated,
 * validated) into the chunked cache.
 *
 * This is the *cache-warming* pass — the Download button, and the resume that
 * happens on page load — so it asks for the files to be cached and nothing
  * else. It does not build a `blob:` URL per file, because there is no caller
  * that wants one: the load path resolves its own URLs from the cache
  * afterwards (`parakeet.ts`). That is not a micro-optimisation. For the
  * WebGPU manifest it is the difference between materialising a 1.24 GB Blob in
  * the JS heap, handing ONNX Runtime a `blob:` URL for it, and revoking that
 * URL a statement later — all to do nothing — and never holding more than one
 * 16 MiB chunk of it at a time.
 *
 * Deliberately does NOT call `fromUrls`/build a `ParakeetModel` either. It
 * used to: this function's result was discarded by its only caller, which
 * threw away the constructed session and let `BrowserASREngine.ensureLoaded()`
 * build a second one right after. That meant ONNX session creation — and any
 * exception from it, including "WebAssembly.Memory initial page count is too
 * large" — happened inside what this function's error handling labels a
 * *download* failure ("Download failed: …"), even though the download itself
 * had already fully succeeded. Downloading and loading are different failure
 * modes with different remedies (retry vs. switch backend), and conflating
 * them is what produced that misleading message. Only download bytes here;
 * let the caller load them.
 *
 * `onCacheWarning` fires when the bytes arrived but the cache refused them.
 * The caller reports that instead of claiming the model is on disk — see
 * `browser-asr-download-manager.ts`.
 */
export async function downloadParakeetModelResumable(
  manifest: AsrModelManifest,
  onProgress?: (p: ModelDownloadProgress) => void,
  onCacheWarning?: (message: string) => void,
): Promise<void> {
  for (const file of manifest.files) {
    const role = categorizeManifestFile(file);
    if (role === 'unknown') {
      // A manifest file this module doesn't know how to route. Downloaded like
      // any other (it is in the manifest, so it is wanted), but the load path
      // cannot wire it into `fromUrls`, so it is worth saying out loud if the
      // manifest grows a new kind of file.
      console.warn(`[resumable-download] Unrecognized manifest file "${file}".`);
    }
    await ensureHfFileCached(manifest.modelRepo, file, 'main', {
      onProgress: (p) => onProgress?.(p),
      onCacheWarning,
      urlOverride: manifest.fileUrlOverrides?.[file],
    });
  }
}
