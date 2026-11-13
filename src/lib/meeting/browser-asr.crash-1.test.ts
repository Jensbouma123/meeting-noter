import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { importAsrModules } from './asr-test-modules';
import { installAsrTestLifecycle } from './asr-test-setup';

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

  it('boots blocked with a crash message instead of auto-loading again', async () => {
    stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await importAsrModules();
    asr.registerDefaultModels('wasm');

    expect(asr.didPreviousModelLoadCrash()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('blocked');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/previous model load crashed the tab/i);
    expect(engineState.instances).toHaveLength(0);
    asr.warmBrowserASR();
    expect(engineState.instances).toHaveLength(0);
  });
  it('retries a crashed load with the smaller model and re-opens consent', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await importAsrModules();
    asr.registerDefaultModels('wasm');
    expect(asr.didPreviousModelLoadCrash()).toBe(true);

    asr.retryCrashedLoadWithSmallerModel();

    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(store.has(MARKER)).toBe(false);
    const registry = { ...(await import('@/lib/asr/browser/model-registry-snapshot')), ...(await import('@/lib/asr/browser/model-registry-consent')) };
    expect(registry.getState().activeBackend).toBe('wasm');
    expect(registry.hasNeverBeenPrompted()).toBe(true);
    expect(registry.getState().dialogVisible).toBe(true);
  });
  it('still loads on Record after a crash — the guard blocks auto-load, not explicit action', async () => {
    stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await importAsrModules();
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });
  it('clears the in-flight marker once a load settles', async () => {
    const store = stubSessionStorage();
    const asr = await importAsrModules();
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    await asr.ensureBrowserASRReady();

    expect(store.has(MARKER)).toBe(false);
  });

  function stubWindow(): (type: string, ev?: object) => void {
    const listeners = new Map<string, ((ev: object) => void)[]>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (ev: object) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), fn]);
      },
    });
    return (type, ev = {}) => listeners.get(type)?.forEach((fn) => fn(ev));
  }
  it('a reload mid-load clears the marker, so the next page is not blocked', async () => {
    const store = stubSessionStorage();
    const fire = stubWindow();
    let release = () => {};
    engineState.loadGate = new Promise<void>((resolve) => (release = resolve));
    const asr = await importAsrModules();
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    const loading = asr.ensureBrowserASRReady();
    await vi.waitFor(() => expect(store.has(MARKER)).toBe(true));
    fire('pagehide', { persisted: false });
    expect(store.has(MARKER)).toBe(false);

    vi.resetModules();
    const next = await importAsrModules();
    expect(next.didPreviousModelLoadCrash()).toBe(false);
    release();
    await loading;
  });
  it('a reload of the page a crash blocked stays blocked', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now()) });
    const fire = stubWindow();
    const asr = await importAsrModules();
    expect(asr.didPreviousModelLoadCrash()).toBe(true);

    fire('pagehide', { persisted: false });
    expect(store.has(MARKER)).toBe(true);

    vi.resetModules();
    const next = await importAsrModules();
    expect(next.didPreviousModelLoadCrash()).toBe(true);
  });
});
