import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadHfFileResumable } from './resumable-download';

/**
 * Simulates "refresh mid-download": a first attempt whose network stream
 * drops partway through (a real page refresh tears down the fetch exactly
 * like this — the reader just stops producing bytes), followed by a second
 * attempt against a server that honors an HTTP Range request. Uses
 * `fake-indexeddb` so the partial-progress bookkeeping this module writes
 * to IndexedDB is real, not mocked away.
 */

const REPO = 'test-org/test-repo';
const FILE = 'weights.bin';
const REVISION = 'main';
const FULL_CONTENT = new Uint8Array(1000).map((_, i) => i % 256);
const ETAG = '"fixed-etag-for-this-file"';

function treeApiResponse(): Response {
  return new Response(
    JSON.stringify([{ type: 'file', path: FILE, size: FULL_CONTENT.length }]),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function headResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: { 'content-length': String(FULL_CONTENT.length), etag: ETAG },
  });
}

/** A body stream that yields bytes up to `breakAt` and then dies — a stand-in
 *  for a page refresh severing the connection mid-stream. */
function droppedConnectionStream(breakAt: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= breakAt) {
        controller.error(new Error('simulated: connection dropped (page refreshed)'));
        return;
      }
      const chunkSize = Math.min(64, breakAt - sent);
      controller.enqueue(FULL_CONTENT.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

function fullStream(from = 0): ReadableStream<Uint8Array> {
  let sent = from;
  return new ReadableStream({
    pull(controller) {
      if (sent >= FULL_CONTENT.length) {
        controller.close();
        return;
      }
      const chunkSize = Math.min(64, FULL_CONTENT.length - sent);
      controller.enqueue(FULL_CONTENT.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

describe('downloadHfFileResumable — refresh mid-download', () => {
  let requestLog: Array<{ url: string; method: string; range: string | null }>;

  beforeEach(() => {
    requestLog = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resumes with a Range request after a dropped connection, and validates the final size', async () => {
    // --- "Session 1": the connection dies after 400 of 1000 bytes. ---
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        requestLog.push({ url, method: init?.method ?? 'GET', range: (init?.headers as Record<string, string>)?.Range ?? null });
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();
        return new Response(droppedConnectionStream(400), { status: 200 });
      }),
    );

    await expect(downloadHfFileResumable(REPO, FILE, REVISION)).rejects.toThrow();

    // --- "Session 2" (post-refresh): a fresh module-level call, server now
    // honors Range and returns the remainder. ---
    requestLog = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
        requestLog.push({ url, method: init?.method ?? 'GET', range });
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();

        if (range) {
          const match = /bytes=(\d+)-/.exec(range);
          const start = match ? Number(match[1]) : 0;
          return new Response(fullStream(start), {
            status: 206,
            headers: {
              'content-range': `bytes ${start}-${FULL_CONTENT.length - 1}/${FULL_CONTENT.length}`,
            },
          });
        }
        return new Response(fullStream(0), { status: 200 });
      }),
    );

    const progressEvents: Array<{ loaded: number; resuming: boolean }> = [];
    const blobUrl = await downloadHfFileResumable(REPO, FILE, REVISION, {
      onProgress: (p) => progressEvents.push({ loaded: p.loaded, resuming: p.resuming }),
    });

    // It actually asked for a Range starting somewhere past zero — proof
    // this was a resume, not a fresh restart from byte zero.
    const getRequest = requestLog.find((r) => r.method === 'GET');
    expect(getRequest?.range).toMatch(/^bytes=\d+-$/);
    const resumedFrom = Number(/^bytes=(\d+)-$/.exec(getRequest!.range!)![1]);
    expect(resumedFrom).toBeGreaterThan(0);
    expect(resumedFrom).toBeLessThan(FULL_CONTENT.length);

    // The UI signal for "Resuming…" fired before real bytes started flowing.
    expect(progressEvents.some((e) => e.resuming)).toBe(true);

    // The assembled file is complete and byte-correct, not a splice error.
    const res = await fetch(blobUrl);
    const finalBytes = new Uint8Array(await res.arrayBuffer());
    expect(finalBytes).toEqual(FULL_CONTENT);
  });

  it('restarts (not resumes) when the server ignores the Range request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        requestLog.push({ url, method: init?.method ?? 'GET', range: (init?.headers as Record<string, string>)?.Range ?? null });
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();
        return new Response(droppedConnectionStream(300), { status: 200 });
      }),
    );
    await expect(downloadHfFileResumable(REPO, `restart-${FILE}`, REVISION)).rejects.toThrow();

    // This "server" always answers with a full 200, even to a Range request —
    // simulating a CDN edge that doesn't support partial content.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();
        return new Response(fullStream(0), { status: 200 }); // ignores Range
      }),
    );

    const blobUrl = await downloadHfFileResumable(REPO, `restart-${FILE}`, REVISION);
    const res = await fetch(blobUrl);
    const finalBytes = new Uint8Array(await res.arrayBuffer());
    expect(finalBytes).toEqual(FULL_CONTENT);
  });
});
