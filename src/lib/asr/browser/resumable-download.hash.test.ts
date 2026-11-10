import 'fake-indexeddb/auto';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_CHUNK_BYTES, DOWNLOAD_STALL_MS, deleteModelCache, downloadHfFileResumable } from './resumable-download';

/**
 * The checksum, over chunks.
 *
 * The reported failure, from a real Safari run of this app's own download
 * path:
 *
 *     Failed to download encoder-model.onnx: checksum mismatch — refusing to
 *     cache a corrupt file
 *
 * The file was not corrupt. `encoder-model.onnx` is 41,770,866 bytes, which is
 * not a whole number of 16 MiB chunks, and the byte list handed to the digest
 * was missing its tail: the short final chunk was only added to that list when
 * the file was *committed*, and the checksum was verified before that. So the
 * digest covered 33,554,432 of 41,770,866 bytes and every download of a file
 * whose size was not a multiple of the chunk size failed verification.
 *
 * The bug is only visible where it was: a real chunk boundary and a real
 * short tail, both of which are exercised here, with the digest's input
 * compared against the file's own bytes rather than a mock's idea of them.
 * The suite's other files all use sub-chunk fixtures, which is exactly why
 * this one does not.
 */

const REVISION = 'main';

function content(length: number, seed = 0): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 31 + (i >> 8) + seed) % 251;
  return bytes;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function bytesBehind(blobUrl: string): Promise<Uint8Array> {
  const response = await fetch(blobUrl);
  return new Uint8Array(await response.arrayBuffer());
}

interface RepoStub {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  ranges: () => Array<string | null>;
}

/**
 * Serve `bytes` for one repo, reporting `treeSha` as the file's checksum in
 * the tree API — the value `leadDownload` verifies against.
 */
function stubRepo(
  repo: string,
  file: string,
  bytes: Uint8Array,
  treeSha: string,
  options: { dropAfterBytes?: number; sliceBytes?: number } = {},
): RepoStub {
  const { dropAfterBytes, sliceBytes = 256 * 1024 } = options;
  const ranges: Array<string | null> = [];
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
    if (url.includes('/api/models/')) {
      return new Response(
        JSON.stringify([{ type: 'file', path: file, size: bytes.length, lfs: { oid: treeSha } }]),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(bytes.length), 'x-linked-etag': `"${treeSha}"` },
      });
    }
    ranges.push(range);
    const start = range ? Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0) : 0;
    const end = dropAfterBytes ?? bytes.length;
    let sent = start;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= end) {
          if (dropAfterBytes !== undefined && end < bytes.length) {
            controller.error(new Error('simulated: connection dropped (page refreshed)'));
            return;
          }
          controller.close();
          return;
        }
        const next = Math.min(end, sent + sliceBytes);
        controller.enqueue(bytes.subarray(sent, next));
        sent = next;
      },
    });
    return new Response(body, {
      status: range ? 206 : 200,
      headers: { 'content-length': String(bytes.length - start), 'x-linked-etag': `"${treeSha}"` },
    });
  });
  vi.stubGlobal('fetch', fn);
  return { fetch: fn as unknown as RepoStub['fetch'], ranges: () => ranges };
}

beforeEach(async () => {
  await deleteModelCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Overwrite one stored chunk with different bytes of the same length.
 *
 * This is the "the partial on disk is not what the server would send" case —
 * a stale tail, a chunk record that outlived the bytes it described — reached
 * the only way a test can reach it: the downloader has no API for writing
 * wrong bytes on purpose, and it should not have one.
 */
function corruptStoredChunk(key: string, index: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('mn-model-cache-db');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const read = db.transaction('chunks', 'readonly').objectStore('chunks').get([key, index]);
      read.onsuccess = () => {
        const original = new Uint8Array(read.result as ArrayBuffer);
        // Flip a single bit, so the length stays right and only the content is
        // wrong — the shape of a real bad splice.
        original[0] = original[0] ^ 0xff;
        const tx = db.transaction('chunks', 'readwrite');
        tx.objectStore('chunks').put(original.buffer, [key, index] as IDBValidKey);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      read.onerror = () => reject(read.error);
    };
  });
}

describe('verifying a file against its checksum', () => {
  it('covers every byte of a file whose size is not a whole number of chunks', async () => {
    // The exact shape of the reported failure: 16 MiB + a short tail.
    const repo = 'test-org/tail-in-the-digest';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 5000);
    stubRepo(repo, file, bytes, sha256(bytes));

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    // A digest that skipped the tail would have thrown here.
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('covers every byte of a file that is many chunks long, tail and all', async () => {
    const repo = 'test-org/many-chunks';
    const file = 'encoder-model.onnx.data';
    const bytes = content(CACHE_CHUNK_BYTES * 3 + 12345);
    stubRepo(repo, file, bytes, sha256(bytes));

    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('covers a file assembled from a stored prefix, a resumed range and a fresh tail', async () => {
    // Resume and chunking together, which is where a wrong offset would show
    // up as a checksum failure rather than as a plausible-looking file.
    const repo = 'test-org/resumed-hash';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 7);
    const digest = sha256(bytes);

    // First attempt dies two chunks into a three-chunk file.
    stubRepo(repo, file, bytes, digest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    // Second attempt: the Range request picks up where the store left off, and
    // the result still has to hash to the file's own checksum.
    const second = stubRepo(repo, file, bytes, digest);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
  });

  it('refuses a file whose bytes do not match, and caches nothing', async () => {
    const repo = 'test-org/genuine-mismatch';
    const file = 'weights.bin';
    const bytes = content(1024);
    // The remote claims a checksum these bytes do not have: a corrupted
    // transfer, or a revision that moved mid-download.
    stubRepo(repo, file, bytes, 'f'.repeat(64));

    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow(/checksum mismatch/);

    const { areModelFilesCached } = await import('./resumable-download');
    expect(await areModelFilesCached({ modelRepo: repo, files: [file] }, REVISION)).toEqual({
      cached: 0,
      total: 1,
      complete: false,
    });
  });
});

describe('a resumed file that does not verify', () => {
  it('discards the partial and takes the whole file again, once', async () => {
    // The only way a resumed file can fail its checksum is a splice that
    // should not have happened, and the cure is the file we no longer trust.
    // Simulated at the only place a wrong splice can come from: the bytes a
    // previous attempt left in the store, which are not what the server would
    // send for the same range.
    const repo = 'test-org/resume-mismatch';
    const file = 'encoder-model.onnx';
    const key = `hf-${repo}-${REVISION}--${file}`;
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 3);
    const digest = sha256(bytes);

    // First attempt: a partial that stops just past the chunk boundary.
    stubRepo(repo, file, bytes, digest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();

    // …and the store ends up holding a spliced file that is subtly wrong, the
    // way a stale tail or a half-written chunk record would.
    await corruptStoredChunk(key, 0);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const second = stubRepo(repo, file, bytes, digest);
    const blobUrl = await downloadHfFileResumable(repo, file, REVISION);

    // Two body requests: the resumed one, then a full one from byte zero.
    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`, null]);
    expect(sha256(await bytesBehind(blobUrl))).toBe(sha256(bytes));
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(/did not match its checksum/i);
  });

  it('fails after exactly one retry, rather than looping', async () => {
    const repo = 'test-org/resume-mismatch-twice';
    const file = 'encoder-model.onnx';
    const bytes = content(CACHE_CHUNK_BYTES + 2000, 5);
    const wrongDigest = 'b'.repeat(64);

    stubRepo(repo, file, bytes, wrongDigest, { dropAfterBytes: CACHE_CHUNK_BYTES + 1000 });
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const second = stubRepo(repo, file, bytes, wrongDigest);
    await expect(downloadHfFileResumable(repo, file, REVISION)).rejects.toThrow(/checksum mismatch/);

    // The retry is the last one: resumed, then from scratch, then it stops.
    expect(second.ranges()).toEqual([`bytes=${CACHE_CHUNK_BYTES + 1000}-`, null]);
  });
});

describe('a body that stops yielding', () => {
  it('fails with a resumable stall error instead of hanging forever', async () => {
    // The download half's own frozen bar: a stream that never yields a chunk
    // and never closes — the shape of a dead connection the server never
    // bothered to terminate, or a storage transaction WebKit never completes.
    const repo = 'test-org/stalled-body';
    const file = 'encoder-model.onnx';
    const size = CACHE_CHUNK_BYTES + 5000;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) {
          return new Response(
            JSON.stringify([{ type: 'file', path: file, size, lfs: { oid: null } }]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (init?.method === 'HEAD') {
          return new Response(null, {
            status: 200,
            headers: { 'content-length': String(size), etag: '"hang-etag"' },
          });
        }
        return new Response(new ReadableStream<Uint8Array>({ pull() {} }), {
          status: 200,
          headers: { 'content-length': String(size) },
        });
      }),
    );

    // The watchdog's own deadline is 60 s; the fake clock jumps straight to
    // it rather than the test waiting for a real one.
    vi.useFakeTimers();
    const download = downloadHfFileResumable(repo, file, REVISION);
    const assertion = expect(download).rejects.toThrow(/stalled/);
    await vi.advanceTimersByTimeAsync(DOWNLOAD_STALL_MS + 1000);
    await assertion;
    vi.useRealTimers();
  });
});
