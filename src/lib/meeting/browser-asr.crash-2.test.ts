import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('a model load that killed the tab', () => {
  const MARKER = 'mn.asr-load-in-progress.v1';

  function stubSessionStorage(initial: Record<string, string> = {}): Map<string, string> {
    const store = new Map(Object.entries(initial));
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
    return store;
  }

  it('a marker too old to be the crash loop does not block', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now() - 60 * 60 * 1000) });
    const asr = await import('./browser-asr');

    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(store.has(MARKER)).toBe(false);
  });
  it('builds the engine once the files are cached, so Record is not stuck behind "Preparing model"', async () => {
    stubSessionStorage();
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    asr.warmBrowserASR();
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.instances).toHaveLength(1);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });
});
