import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The download manager's bookkeeping around cancel, retry and progress.
 *
 * The downloader itself is mocked: what is pinned here is what the manager
 * does with a download that is slow, cancelled, restarted or split across
 * several files — the network and the cache are `resumable-download.ts`'s own
 * tests' business.
 */

vi.mock('./resumable-download', () => ({
  downloadParakeetModelResumable: vi.fn(),
  closeModelCacheConnections: vi.fn(),
  deleteModelCache: vi.fn(async () => ({ deleted: true })),
  abortInFlightDownloads: vi.fn(),
  isDownloadCancelled: (err: unknown) => err instanceof Error && err.name === 'AbortError',
}));

type Progress = { loaded: number; total: number; file: string; resuming: boolean };

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function installLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  });
}

async function load() {
  const registry = await import('./model-registry');
  const manager = await import('./browser-asr-download-manager');
  const downloader = await import('./resumable-download');
  registry.initRegistry();
  return { registry, manager, downloader };
}

/** A non-ASR entry, so the size probe never runs and a handler is the download. */
function registerTestModel(registry: typeof import('./model-registry'), key: string): void {
  registry.registerModel({
    key,
    modelRepo: `test/${key}`,
    displayName: key,
    estimatedSizeBytes: 1_000,
    backend: 'wasm',
    kind: 'test',
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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

    // The handler ignores the abort and completes: it must not override "Not now".
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
    // A third call joins the running second download instead of starting one.
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
    manager.registerDownloadHandler('test', async (onProgress: (p: Progress) => void) => {
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

describe('a missing WebGPU encoder', () => {
  it('falls back to the next variant on a 404, keeps consent, and downloads it', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { registry, manager, downloader } = await load();
    const detect = await import('./backend-detect');
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    detect.resetAsrBackendDetectionForTests();

    registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);

    const seen: string[] = [];
    vi.mocked(downloader.downloadParakeetModelResumable).mockImplementation(async (m) => {
      seen.push(m.variant);
      if (m.variant !== 'wasm-int8') {
        throw new Error(`Failed to download ${m.files[0]}: 404 Not Found (/x)`);
      }
    });
    // Skip the network size probe.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    await manager.initiateDownloads();

    // q4f16 -> fp16 (both 404) -> CPU int8, which succeeds.
    expect(seen).toEqual(['webgpu-q4f16', 'webgpu-fp16', 'wasm-int8']);
    const entry = registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key];
    expect(entry.variant).toBe('wasm-int8');
    expect(entry.status).toBe('cached');
    expect(entry.description).toMatch(/isn't available here/);
    expect(registry.isConsentGiven(PARAKEET_TDT_V3_WEBGPU.key)).toBe(true);
  });

  it('does not fall back on a non-404 failure', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { registry, manager, downloader } = await load();
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);
    vi.mocked(downloader.downloadParakeetModelResumable).mockRejectedValue(
      new Error('Failed to download encoder-model.q4f16.onnx: 503 Service Unavailable (/x)'),
    );
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

    await expect(manager.initiateDownloads()).rejects.toThrow(/503/);
    expect(registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key].variant).toBe('webgpu-q4f16');
  });
});

describe('saved choice migration', () => {
  it('re-points a saved, unavailable WebGPU variant at the CPU one, keeping consent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_Q4F16_ENCODER_URL', '');
    vi.stubEnv('NEXT_PUBLIC_FP16_ENCODER_URL', '');
    vi.stubGlobal('window', {});
    const first = await load();
    const { PARAKEET_TDT_V3_WEBGPU } = await import('./model-manifest');
    first.registry.registerManifest(PARAKEET_TDT_V3_WEBGPU);
    first.registry.markFailed(PARAKEET_TDT_V3_WEBGPU.key, 'Download failed: Failed to download encoder-model.q4f16.onnx: 404');
    first.registry.recordConsent('accepted', [PARAKEET_TDT_V3_WEBGPU.key]);

    // A fresh page load reads what was persisted.
    vi.resetModules();
    const second = await load();
    const entry = second.registry.getState().entries[PARAKEET_TDT_V3_WEBGPU.key];
    expect(entry.variant).toBe('wasm-int8');
    expect(entry.backend).toBe('wasm');
    expect(entry.status).toBe('not-downloaded');
    expect(second.registry.isConsentGiven(PARAKEET_TDT_V3_WEBGPU.key)).toBe(true);
  });
});
