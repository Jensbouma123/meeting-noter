import { afterEach, beforeEach, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import type { AsrEngineTestState } from './types/asr-test';
import { resetEngineState } from './asr-test-engine-state';
import { clearModelCache, seedManifestCache, stubWebgpuAdapter } from './asr-test-cache';

export function installAsrTestLifecycle(state: AsrEngineTestState): { consoleError: () => ReturnType<typeof vi.spyOn> } {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    resetEngineState(state);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.resetModules();
    await clearModelCache();
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  return { consoleError: () => consoleError };
}

export async function loadBrowserAsr() {
  const mod = await import('./browser-asr');
  mod.registerDefaultModels('wasm');
  return mod;
}

export async function loadWebgpuAsr(): Promise<typeof import('./browser-asr')> {
  stubWebgpuAdapter();
  await seedManifestCache(PARAKEET_TDT_V3_WEBGPU);
  const mod = await import('./browser-asr');
  mod.registerDefaultModels('webgpu');
  const registry = { ...(await import('@/lib/asr/browser/model-registry-status')), ...(await import('@/lib/asr/browser/model-registry-consent')) };
  registry.markCached('parakeet-ttd');
  registry.recordConsent('accepted', ['parakeet-ttd']);
  return mod;
}
