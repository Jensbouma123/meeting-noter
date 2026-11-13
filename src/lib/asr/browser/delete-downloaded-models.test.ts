import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  areModelFilesCached,
  deleteModelCache,
  isDownloadCancelled,
} from './resumable-download';
import {
  deleteDownloadedModels,
  initiateDownloads,
} from './browser-asr-download-manager';
import { getState, recordConsent, registerModel } from './model-registry';
import { PARAKEET_TDT_V3_WASM } from './model-manifest';

const KEY = 'parakeet-ttd';
const FILE_SIZE = 4096;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function stubHangingDownload(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/models/')) {
        return new Response(
          JSON.stringify(PARAKEET_TDT_V3_WASM.files.map((path) => ({ path, size: FILE_SIZE }))),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(FILE_SIZE), etag: '"test-etag"' },
        });
      }
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(128));
          },
          pull() {
          },
        }),
        { status: 200, headers: { 'content-length': String(FILE_SIZE) } },
      );
    }),
  );
}

beforeEach(async () => {
  await deleteModelCache();
  registerModel({
    key: PARAKEET_TDT_V3_WASM.key,
    modelRepo: PARAKEET_TDT_V3_WASM.modelRepo,
    displayName: PARAKEET_TDT_V3_WASM.displayName,
    estimatedSizeBytes: PARAKEET_TDT_V3_WASM.fallbackSizeBytes,
    backend: 'wasm',
  });
  recordConsent('accepted', [KEY]);
  stubHangingDownload();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('deleteDownloadedModels mid-download', () => {
  it('aborts the in-flight download, then deletes both caches and the readiness claim', async () => {
    const downloadPromise = initiateDownloads();
    const downloadOutcome = downloadPromise.then(
      () => null,
      (err: unknown) => err,
    );
    await sleep(800);
    expect(getState().entries[KEY]?.status).toBe('downloading');

    const result = await deleteDownloadedModels();

    expect(result).toEqual({ deleted: true });
    await expect(downloadOutcome).resolves.toSatisfy(isDownloadCancelled);
    expect(getState().entries[KEY]?.status).toBe('not-downloaded');
    expect(getState().entries[KEY]?.isReady).toBe(false);
    expect(await areModelFilesCached(PARAKEET_TDT_V3_WASM)).toEqual({
      cached: 0,
      total: PARAKEET_TDT_V3_WASM.files.length,
      complete: false,
    });
    await sleep(100);
    expect(getState().entries[KEY]?.status).toBe('not-downloaded');
  });
});
