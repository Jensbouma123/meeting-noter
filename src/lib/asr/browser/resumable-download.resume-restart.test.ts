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

describe('downloadHfFileResumable — range ignored by the server', () => {
  let requestLog: Array<{ url: string; method: string; range: string | null }>;

  beforeEach(() => {
    requestLog = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restarts (not resumes) when the server ignores the Range request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        logRequest(requestLog, input, init);
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
