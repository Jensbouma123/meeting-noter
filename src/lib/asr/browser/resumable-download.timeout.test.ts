import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CACHED_META_DEADLINE_MS,
  REPO_TREE_TIMEOUT_MS,
  deleteModelCache,
  downloadHfFileResumable,
  getRepoFileMeta,
} from './resumable-download';

/**
 * Timeouts on the HF metadata lookup. A stalled tree request must not hang a
 * download: a cached file is served past the deadline, a failed lookup is not
 * remembered, and a lookup that never answers gives up.
 */

const REVISION = 'main';

function content(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = (i * 17 + 3) % 251;
  return bytes;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Serve one file whole; the tree API answers normally. */
function serveRepo(file: string, bytes: Uint8Array): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/models/')) {
      return json([{ type: 'file', path: file, size: bytes.length }]);
    }
    const headers = { 'content-length': String(bytes.length), etag: `"${file}-etag"` };
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers });
    return new Response(bytes.slice(0), { status: 200, headers });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** A fetch whose requests never answer, and which fail only when aborted. */
function stalledFetch(): ReturnType<typeof vi.fn> {
  const fn = vi.fn(
    (_input: string | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(async () => {
  await deleteModelCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the HF metadata lookup never hangs a download', () => {
  it('gives up on a tree listing that never answers, and reports no metadata', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fetchFn = stalledFetch();

    const meta = getRepoFileMeta('timeout-org/stalled-tree', REVISION, 'weights.bin');
    await vi.advanceTimersByTimeAsync(REPO_TREE_TIMEOUT_MS);

    expect(await meta).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not remember a failed tree listing, so the next file retries it', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
      .mockResolvedValueOnce(json([{ type: 'file', path: 'weights.bin', size: 1234 }]));
    vi.stubGlobal('fetch', fetchFn);

    expect(await getRepoFileMeta('retry-org/failed-tree', REVISION, 'weights.bin')).toBeNull();
    expect(await getRepoFileMeta('retry-org/failed-tree', REVISION, 'weights.bin')).toEqual({
      size: 1234,
      sha256: null,
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('serves a cached file without waiting for a tree listing that never answers', async () => {
    const repo = 'timeout-org/cached-file';
    const file = 'weights.bin';
    const bytes = content(64 * 1024);
    serveRepo(file, bytes);
    await downloadHfFileResumable(repo, file, REVISION);

    // A fresh module instance has an empty tree memo, so the only listing it
    // can see is the stalled one; the file itself stays in the shared cache.
    vi.resetModules();
    const fresh = await import('./resumable-download');
    const stalled = stalledFetch();
    const started = Date.now();
    const url = await fresh.downloadHfFileResumable(repo, file, REVISION);

    expect(Date.now() - started).toBeGreaterThanOrEqual(CACHED_META_DEADLINE_MS - 50);
    expect(stalled.mock.calls.every(([input]) => String(input).includes('/api/models/'))).toBe(true);
    expect(url).toMatch(/^blob:/);
  }, 15_000);
});
