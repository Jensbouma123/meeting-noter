import 'fake-indexeddb/auto';
import { importAsrModules } from '@/lib/meeting/asr-test-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import {
  LOAD_MARKER,
  downloadModel,
  readiness,
  stubModelNetwork,
  stubPageStorage,
  stubWebgpuDevice,
} from './modelReadiness.cache.testUtils';


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

    const registry = { ...(await import('@/lib/asr/browser/model-registry-register')) };
    expect(registry.getModelStatus('parakeet-ttd')?.status).toBe('cached');
    await new Promise((resolve) => setTimeout(resolve, 50));
    const { areModelFilesCached } = await import('@/lib/asr/browser/resumable-download');
    expect((await areModelFilesCached(PARAKEET_TDT_V3_WEBGPU)).complete).toBe(true);

    const asr = await importAsrModules();
    asr.enableBrowserASR();
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(await readiness()).toBe('ready');
  });

  it('never says "download it" after a reload interrupted the model load', async () => {
    const page = stubPageStorage();
    stubWebgpuDevice();
    stubModelNetwork(PARAKEET_TDT_V3_WEBGPU);
    await downloadModel();
    page.session.set(LOAD_MARKER, String(Date.now()));

    vi.resetModules();
    stubPageStorage(page);
    const registry = { ...(await import('@/lib/asr/browser/model-registry-register')) };
    registry.initRegistry();
    registry.registerDefaultModels('webgpu');
    const asr = await importAsrModules();
    asr.enableBrowserASR();
    expect(registry.getModelStatus('parakeet-ttd')?.status).toBe('cached');

    asr.warmBrowserASR();
    expect(engineState.instances).toBe(0);
    expect(await readiness()).toBe('ready');

    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.instances).toBe(1);
    expect(await readiness()).toBe('ready');
  });
});
