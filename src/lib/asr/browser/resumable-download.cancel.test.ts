import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  abortInFlightDownloads,
  ensureHfFileCached,
  isDownloadCancelled,
  probeCachedModelFiles,
} from './resumable-download';
import {
  REVISION,
  FILE,
  CONTENT,
  treeApiResponse,
  headResponse,
  streamOf,
  deferred,
  waitUntil,
} from './resumable-download.cancel-fixtures';

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
