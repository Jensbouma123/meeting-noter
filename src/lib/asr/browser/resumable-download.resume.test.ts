import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadHfFileResumable } from './resumable-download';
import {
  FILE,
  FULL_CONTENT,
  REPO,
  REVISION,
  droppedConnectionStream,
  fullStream,
  headResponse,
  logRequest,
  treeApiResponse,
} from './resumable-download.resume.test-support';

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
        logRequest(requestLog, input, init);
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
        logRequest(requestLog, input, init);
        if (url.includes('/api/models/')) return treeApiResponse();
        if (init?.method === 'HEAD') return headResponse();

        const range = (init?.headers as Record<string, string> | undefined)?.Range ?? null;
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
});
