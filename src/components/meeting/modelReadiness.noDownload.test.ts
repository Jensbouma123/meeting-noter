import 'fake-indexeddb/auto';
import { importAsrModules } from '@/lib/meeting/asr-test-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { downloadModel, stubModelNetwork, stubPageStorage, stubWebgpuDevice } from './modelReadiness.cache.testUtils';

vi.mock('@/lib/asr/browser/parakeet', () => ({
  BrowserASREngine: class {
    isReady = false;
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
  },
}));

beforeEach(async () => {
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

function modelFileFetches(): unknown[] {
  const calls = vi.mocked(fetch).mock.calls as [string | URL, RequestInit | undefined][];
  const isProbe = (url: string, init?: RequestInit) =>
    init?.method === 'HEAD' || url.includes('/api/models/') || url.endsWith('.sha256');
  return calls.filter(([url, init]) => !isProbe(String(url), init));
}

describe('starting a meeting with the speech model cached', () => {
  it('loads from the cache without downloading anything again', async () => {
    const page = stubPageStorage();
    stubWebgpuDevice();
    stubModelNetwork(PARAKEET_TDT_V3_WEBGPU);
    await downloadModel();

    vi.resetModules();
    stubPageStorage(page);
    stubModelNetwork(PARAKEET_TDT_V3_WEBGPU);
    const registry = await import('@/lib/asr/browser/model-registry-register');
    const manager = await import('@/lib/asr/browser/browser-asr-download-manager');
    registry.initRegistry();
    registry.registerDefaultModels('webgpu');
    manager.autoResumeConsentedDownloads();
    const asr = await importAsrModules();
    asr.enableBrowserASR();

    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(registry.getModelStatus('parakeet-ttd')?.status).toBe('cached');
    expect(modelFileFetches()).toEqual([]);
  });
});
