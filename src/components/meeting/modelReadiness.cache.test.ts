import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest';

/**
 * "Speech model needed. Download it in Settings to start recording." on a
 * device whose model is fully downloaded — end to end, from the bytes in
 * IndexedDB to the value the meeting view branches on.
 *
 * The real downloader, registry and engine state machine run here; only the
 * ONNX engine is faked (it is what would need the real model to load) and the
 * network is stubbed.
 */

const engineState = vi.hoisted(() => ({ instances: 0 }));

vi.mock('@/lib/asr/browser/parakeet', () => {
  class FakeBrowserASREngine {
    isReady = false;
    constructor() {
      engineState.instances += 1;
    }
    async ensureLoaded(): Promise<void> {
      this.isReady = true;
    }
    getStatus() {
      return this.isReady ? 'ready' : 'idle';
    }
    async stop(): Promise<void> {}
    disable(): void {
      this.isReady = false;
    }
    lockLanguage(): void {}
    unlockLanguage(): void {}
  }
  return { BrowserASREngine: FakeBrowserASREngine };
});

const LOAD_MARKER = 'mn.asr-load-in-progress.v1';
const CONTENT = new Uint8Array(64).map((_, i) => i % 251);

/** The model's files on a network that answers the tree API, HEADs and GETs. */
function stubModelNetwork(manifest: typeof PARAKEET_TDT_V3_WEBGPU): void {
  const hosted = manifest.files.filter((f) => manifest.fileUrlOverrides?.[f] === undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/models/')) {
        return new Response(
          JSON.stringify(hosted.map((path) => ({ type: 'file', path, size: CONTENT.length }))),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (init?.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: { 'content-length': String(CONTENT.length), etag: `"${url}"` },
        });
      }
      return new Response(CONTENT, { status: 200 });
    }),
  );
}

/** A device with a working WebGPU adapter, so the model transcribes live. */
function stubWebgpuDevice(): void {
  // No rival tab to wait for: `withDownloadLock` takes its fast path.
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    gpu: { requestAdapter: async () => ({ isFallbackAdapter: false }) },
  });
}

/** A Map-backed `Storage` (Node has none), so a "reload" can keep it. */
function stubStorage(name: 'localStorage' | 'sessionStorage', initial: Record<string, string> = {}): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal(name, {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
  return store;
}

/** A page's two storages. The registry persists to `localStorage`, the load
 *  marker to `sessionStorage`; both survive a same-tab reload. */
function stubPageStorage(
  saved: { local?: Map<string, string>; session?: Map<string, string> } = {},
): { local: Map<string, string>; session: Map<string, string> } {
  // `initRegistry()` only reads persisted state in a browser.
  vi.stubGlobal('window', globalThis);
  return {
    local: stubStorage('localStorage', Object.fromEntries(saved.local ?? [])),
    session: stubStorage('sessionStorage', Object.fromEntries(saved.session ?? [])),
  };
}

/** Consent, then the real download manager fetching every file into IndexedDB. */
async function downloadModel(): Promise<void> {
  const registry = await import('@/lib/asr/browser/model-registry');
  const manager = await import('@/lib/asr/browser/browser-asr-download-manager');
  registry.registerDefaultModels('webgpu');
  registry.recordConsent('accepted', ['parakeet-ttd']);
  await manager.initiateDownloads();
}

/** What the meeting view computes, from the same two stores it reads. */
async function readiness(): Promise<string> {
  const registry = await import('@/lib/asr/browser/model-registry');
  const asr = await import('@/lib/meeting/browser-asr');
  const { deriveModelReadiness } = await import('./modelReadiness');
  const progress = asr.getBrowserASRProgress();
  return deriveModelReadiness(Object.values(registry.getState().entries), {
    enabled: progress.enabled,
    phase: progress.phase,
  });
}

beforeEach(async () => {
  engineState.instances = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.resetModules();
  const { deleteModelCache } = await import('@/lib/asr/browser/resumable-download');
  await deleteModelCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('a fully downloaded speech model', () => {
  it('is ready once loaded — the legacy-sweep flag in the cache database does not hide it', async () => {
    stubPageStorage();
    stubWebgpuDevice();
    stubModelNetwork(PARAKEET_TDT_V3_WEBGPU);
    await downloadModel();

    const registry = await import('@/lib/asr/browser/model-registry');
    expect(registry.getModelStatus('parakeet-ttd')?.status).toBe('cached');
    // The sweep is not awaited; give it time to write its flag record before
    // the cache is read back, which is the state every later page load is in.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const { areModelFilesCached } = await import('@/lib/asr/browser/resumable-download');
    expect((await areModelFilesCached(PARAKEET_TDT_V3_WEBGPU)).complete).toBe(true);

    const asr = await import('@/lib/meeting/browser-asr');
    asr.enableBrowserASR();
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(await readiness()).toBe('ready');
  });

  it('never says "download it" after a reload interrupted the model load', async () => {
    // First page: the model downloads and the load starts…
    const page = stubPageStorage();
    stubWebgpuDevice();
    stubModelNetwork(PARAKEET_TDT_V3_WEBGPU);
    await downloadModel();
    // …and the tab reloads mid-load (a refresh, a dev-server reload, a
    // navigation): the load never settled, so its in-flight marker is still
    // in this tab's `sessionStorage` — the same trace a crashed load leaves.
    page.session.set(LOAD_MARKER, String(Date.now()));

    // Second page: fresh module state, same storage.
    vi.resetModules();
    stubPageStorage(page);
    const registry = await import('@/lib/asr/browser/model-registry');
    registry.initRegistry();
    registry.registerDefaultModels('webgpu');
    const asr = await import('@/lib/meeting/browser-asr');
    asr.enableBrowserASR();
    expect(registry.getModelStatus('parakeet-ttd')?.status).toBe('cached');

    // The crash guard still refuses to auto-load…
    asr.warmBrowserASR();
    expect(engineState.instances).toBe(0);
    // …but the model is on disk: the remedy is to load it (Record), not to
    // download it, so Record must stay reachable.
    expect(await readiness()).toBe('ready');

    // And Record's explicit load is what clears the guard.
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.instances).toBe(1);
    expect(await readiness()).toBe('ready');
  });
});
