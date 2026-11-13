import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureHfFileCached,
} from './resumable-download';
import {
  REVISION,
  FILE,
  treeApiResponse,
  headResponse,
  streamOf,
  waitUntil,
} from './resumable-download.cancel-fixtures';

describe('resumable download — cross-tab progress broadcast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts far fewer progress messages than fetch chunks, and always the final byte count', async () => {
    const repo = 'test-org/broadcast-throttle';
    const size = 32 * 1024;
    const chunkSize = 16;
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
    expect(onProgressCalls).toBeGreaterThanOrEqual(chunks);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.length).toBeLessThan(chunks / 10);
    expect(posts[posts.length - 1]).toEqual({ loaded: size, total: size });
  });
});
