import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flush, installLocalStorage, load, registerTestModel } from './browser-asr-download-manager.test-support';
import type { DownloadProgressEvent } from './types';

vi.mock('./resumable-download', () => ({
  downloadParakeetModelResumable: vi.fn(),
  closeModelCacheConnections: vi.fn(),
  deleteModelCache: vi.fn(async () => ({ deleted: true })),
  abortInFlightDownloads: vi.fn(),
  isDownloadCancelled: (err: unknown) => err instanceof Error && err.name === 'AbortError',
}));


beforeEach(() => {
  vi.resetModules();
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('cancelDownloads', () => {
  it('aborts the fetch, and a download that finishes anyway stays cancelled', async () => {
    const { registry, manager, downloader } = await load();
    registerTestModel(registry, 'a');
    registry.recordConsent('accepted', ['a']);
    const gate = deferred();
    manager.registerDownloadHandler('test', () => gate.promise);

    const download = manager.initiateDownloads();
    await flush();
    expect(registry.getState().entries.a.status).toBe('downloading');

    manager.cancelDownloads();
    expect(downloader.abortInFlightDownloads).toHaveBeenCalled();

    gate.resolve();
    await download;
    expect(registry.getState().entries.a.status).toBe('cancelled');
    expect(registry.getState().entries.a.isReady).toBe(false);
  });

  it("keeps a restarted download's promise when the cancelled one settles", async () => {
    const { registry, manager } = await load();
    registerTestModel(registry, 'a');
    registry.recordConsent('accepted', ['a']);
    const gates = [deferred(), deferred()];
    const handler = vi.fn(() => gates[handler.mock.calls.length - 1].promise);
    manager.registerDownloadHandler('test', handler);

    const first = manager.initiateDownloads();
    await flush();
    manager.cancelDownloads();
    const second = manager.initiateDownloads();
    await flush();
    expect(handler).toHaveBeenCalledTimes(2);

    gates[0].resolve();
    await first;
    const third = manager.initiateDownloads();
    await flush();
    expect(handler).toHaveBeenCalledTimes(2);

    gates[1].resolve();
    await Promise.all([second, third]);
    expect(registry.getState().entries.a.status).toBe('cached');
  });

  it('is triggered by a declined consent recorded anywhere', async () => {
    const { registry, manager, downloader } = await load();
    registerTestModel(registry, 'a');
    registry.recordConsent('accepted', ['a']);
    const gate = deferred();
    manager.registerDownloadHandler('test', () => gate.promise);

    const download = manager.initiateDownloads();
    await flush();
    registry.recordConsent('declined', []);
    expect(downloader.abortInFlightDownloads).toHaveBeenCalled();

    gate.resolve();
    await download;
    expect(registry.getState().entries.a.status).toBe('cancelled');
  });
});

describe('consent and retry', () => {
  it('retryDownload restarts only the entry it was asked to', async () => {
    const { registry, manager } = await load();
    registerTestModel(registry, 'cancelled-one');
    registerTestModel(registry, 'failed-one');
    registry.recordConsent('accepted', ['cancelled-one', 'failed-one']);
    registry.markCancelled('cancelled-one');
    registry.markFailed('failed-one', 'Download failed: 500');
    const handler = vi.fn(async () => {});
    manager.registerDownloadHandler('test', handler);

    await manager.retryDownload('failed-one');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(registry.getState().entries['failed-one'].status).toBe('cached');
    expect(registry.getState().entries['failed-one'].error).toBeNull();
    expect(registry.getState().entries['cancelled-one'].status).toBe('cancelled');
  });

  it('initiateDownloads starts nothing when consent was declined', async () => {
    const { registry, manager } = await load();
    registerTestModel(registry, 'a');
    registry.recordConsent('declined', []);
    const handler = vi.fn(async () => {});
    manager.registerDownloadHandler('test', handler);

    await manager.initiateDownloads();

    expect(handler).not.toHaveBeenCalled();
    expect(registry.getState().entries.a.status).toBe('not-downloaded');
  });
});

describe('progress across files', () => {
  it('reports cumulative bytes that never decrease at a file boundary', async () => {
    const { registry, manager } = await load();
    registerTestModel(registry, 'a');
    registry.recordConsent('accepted', ['a']);
    const seen: number[] = [];
    manager.registerDownloadHandler('test', async (onProgress: (p: DownloadProgressEvent) => void) => {
      for (const [file, loaded] of [
        ['encoder', 300],
        ['encoder', 600],
        ['decoder', 100],
        ['decoder', 400],
      ] as const) {
        onProgress({ loaded, total: 0, file, resuming: false });
        seen.push(registry.getState().entries.a.progress.loadedBytes);
      }
    });

    await manager.initiateDownloads();

    expect(seen).toEqual([300, 600, 700, 1_000]);
    expect(registry.getState().entries.a.progress.loadedBytes).toBe(1_000);
  });
});

