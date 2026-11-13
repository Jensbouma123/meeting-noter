import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadHfFileResumable } from './resumable-download';

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

    const getRequest = requestLog.find((r) => r.method === 'GET');
    expect(getRequest?.range).toMatch(/^bytes=\d+-$/);
    const resumedFrom = Number(/^bytes=(\d+)-$/.exec(getRequest!.range!)![1]);
    expect(resumedFrom).toBeGreaterThan(0);
    expect(resumedFrom).toBeLessThan(FULL_CONTENT.length);

    expect(progressEvents.some((e) => e.resuming)).toBe(true);

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

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();
        return new Response(fullStream(0), { status: 200 });
      }),
    );

    const blobUrl = await downloadHfFileResumable(REPO, `restart-${FILE}`, REVISION);
    const res = await fetch(blobUrl);
    const finalBytes = new Uint8Array(await res.arrayBuffer());
    expect(finalBytes).toEqual(FULL_CONTENT);
  });
});
