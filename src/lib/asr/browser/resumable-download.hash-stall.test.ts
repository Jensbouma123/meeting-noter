import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { CACHE_CHUNK_BYTES, DOWNLOAD_STALL_MS, downloadHfFileResumable } from './resumable-download';
import {
  installHashHooks,
  REVISION,
} from './resumable-download.hash-fixtures';

installHashHooks();

describe('a body that stops yielding', () => {
  it('fails with a resumable stall error instead of hanging forever', async () => {
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

    vi.useFakeTimers();
    const download = downloadHfFileResumable(repo, file, REVISION);
    const assertion = expect(download).rejects.toThrow(/stalled/);
    await vi.advanceTimersByTimeAsync(DOWNLOAD_STALL_MS + 1000);
    await assertion;
    vi.useRealTimers();
  });
});
