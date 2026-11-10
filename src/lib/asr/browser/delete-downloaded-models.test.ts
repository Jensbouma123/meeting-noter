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

/**
 * "Delete downloaded models" pressed mid-download.
 *
 * The button used to be disabled while a download was running, which is
 * exactly when a stuck download (the frozen "Downloading model 99%") needs
 * it. It aborts first and deletes second now, and this pins both halves:
 * the in-flight fetch settles as a *cancel* (not a stall, not a short-file
 * failure, not `failed`), and nothing it writes afterwards can un-delete
 * what was just deleted.
 */

const KEY = 'parakeet-ttd';
const FILE_SIZE = 4096;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Serve the manifest's files: instant metadata, a body that hangs forever. */
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
      // One chunk, then silence: the "Downloading model 99%" hang. The read
      // never resolves until the downloader's abort cancels it.
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(128));
          },
          pull() {
            // Never produce, never close — hang until cancelled.
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
    // Settle-handler attached up front: the rejection is asserted below, but
    // only after the delete — without this the abort would flag as unhandled
    // in between.
    const downloadOutcome = downloadPromise.then(
      () => null,
      (err: unknown) => err,
    );
    // Past the cross-tab lock handshake (350 ms) and into the hanging body.
    await sleep(800);
    expect(getState().entries[KEY]?.status).toBe('downloading');

    const result = await deleteDownloadedModels();

    expect(result).toEqual({ deleted: true });
    // The aborted download settles as a cancel — retried, never reported.
    await expect(downloadOutcome).resolves.toSatisfy(isDownloadCancelled);
    // The readiness claim in localStorage's shape is gone with the bytes.
    expect(getState().entries[KEY]?.status).toBe('not-downloaded');
    expect(getState().entries[KEY]?.isReady).toBe(false);
    expect(await areModelFilesCached(PARAKEET_TDT_V3_WASM)).toEqual({
      cached: 0,
      total: PARAKEET_TDT_V3_WASM.files.length,
      complete: false,
    });
    // No stale terminal write lands after the reset: the aborted download
    // was awaited before the registry was reset, so nothing is left that
    // could flip this to `failed` afterwards.
    await sleep(100);
    expect(getState().entries[KEY]?.status).toBe('not-downloaded');
  });
});
