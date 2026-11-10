import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abortInFlightDownloads,
  ensureHfFileCached,
  isDownloadCancelled,
  probeCachedModelFiles,
} from './resumable-download';

/**
 * A cancel (or "delete downloaded models") has to stop a download whatever
 * phase it is in — including the pre-fetch phase, before any body bytes
 * flow: the tree lookup, the HEAD, and the resume-record reads. A cancel
 * that lands there used to be missed (the abort generation was captured
 * after those awaits), so the download ran in full and wrote the file back
 * right after the delete.
 */

const REVISION = 'main';
const FILE = 'weights.bin';
const CONTENT = new Uint8Array(1000).map((_, i) => i % 256);

function treeApiResponse(size = CONTENT.length): Response {
  return new Response(JSON.stringify([{ type: 'file', path: FILE, size }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function headResponse(size = CONTENT.length): Response {
  return new Response(null, {
    status: 200,
    headers: { 'content-length': String(size), etag: '"etag"' },
  });
}

function streamOf(bytes: Uint8Array, chunkSize: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

/** A promise plus the function that settles it — a request held open. */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function waitUntil(cond: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !cond(); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(cond()).toBe(true);
}

describe('resumable download — cancel during the pre-fetch phase', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects as cancelled and issues no GET when the cancel lands while the HEAD is pending', async () => {
    const repo = 'test-org/cancel-during-head';
    const methods: string[] = [];
    const head = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) return treeApiResponse();
        methods.push(init?.method ?? 'GET');
        if (init?.method === 'HEAD') return head.promise;
        return new Response(streamOf(CONTENT, 64), { status: 200 });
      }),
    );

    const download = ensureHfFileCached(repo, FILE, REVISION);
    const settled = download.catch((err: unknown) => err);
    await waitUntil(() => methods.includes('HEAD'));

    abortInFlightDownloads();
    // The origin answers anyway (a mock that ignores the signal, like a
    // response already on its way): the cancel must still win.
    head.resolve(headResponse());

    const err = await settled;
    expect(isDownloadCancelled(err)).toBe(true);
    expect(methods).toEqual(['HEAD']);
    const probes: boolean[] = [];
    await probeCachedModelFiles({ modelRepo: repo, files: [FILE] }, (p) => probes.push(p.cached), REVISION);
    expect(probes).toEqual([false]);
  });

  it('rejects as cancelled and issues no HEAD when the cancel lands during the tree lookup', async () => {
    const repo = 'test-org/cancel-during-tree';
    const methods: string[] = [];
    const tree = deferred<Response>();
    let treeRequested = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) {
          treeRequested = true;
          return tree.promise;
        }
        methods.push(init?.method ?? 'GET');
        if (init?.method === 'HEAD') return headResponse();
        return new Response(streamOf(CONTENT, 64), { status: 200 });
      }),
    );

    const settled = ensureHfFileCached(repo, FILE, REVISION).catch((err: unknown) => err);
    await waitUntil(() => treeRequested);

    abortInFlightDownloads();
    tree.resolve(treeApiResponse());

    const err = await settled;
    expect(isDownloadCancelled(err)).toBe(true);
    expect(methods).toEqual([]);
  });
});

describe('resumable download — cross-tab progress broadcast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts far fewer progress messages than fetch chunks, and always the final byte count', async () => {
    const repo = 'test-org/broadcast-throttle';
    const size = 32 * 1024;
    const chunkSize = 16; // 2048 chunks
    const bytes = new Uint8Array(size).map((_, i) => i % 251);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) return treeApiResponse(size);
        if (init?.method === 'HEAD') return headResponse(size);
        return new Response(streamOf(bytes, chunkSize), { status: 200 });
      }),
    );

    const posts: Array<{ loaded: number; total: number }> = [];
    const listener = new BroadcastChannel('mn-model-download');
    listener.addEventListener('message', (ev: MessageEvent) => {
      if (ev.data?.type === 'progress') posts.push({ loaded: ev.data.loaded, total: ev.data.total });
    });
    let onProgressCalls = 0;
    try {
      await ensureHfFileCached(repo, FILE, REVISION, { onProgress: () => (onProgressCalls += 1) });
      await waitUntil(() => posts.some((p) => p.loaded === size));
    } finally {
      listener.close();
    }

    const chunks = size / chunkSize;
    // The local callback is untouched: the registry does its own throttling.
    expect(onProgressCalls).toBeGreaterThanOrEqual(chunks);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.length).toBeLessThan(chunks / 10);
    expect(posts[posts.length - 1]).toEqual({ loaded: size, total: size });
  });
});
