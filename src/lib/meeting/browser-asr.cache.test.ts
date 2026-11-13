import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU, PARAKEET_TDT_V3_WEBGPU_FP16 } from '@/lib/asr/browser/model-manifest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

const lifecycle = installAsrTestLifecycle(engineState);

describe('a cached claim the storage no longer backs', () => {
  it('re-downloads instead of silently loading a model that is not there', async () => {
    const asr = await loadBrowserAsr();
    const registry = await import('@/lib/asr/browser/model-registry');
    registry.recordConsent('accepted', ['parakeet-ttd']);
    registry.markCached('parakeet-ttd');
    expect(registry.getModelStatus('parakeet-ttd')!.status).toBe('cached');

    const fetchStub = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchStub);

    const ready = await asr.ensureBrowserASRReady();

    expect(registry.getModelStatus('parakeet-ttd')!.status).not.toBe('cached');
    expect(fetchStub).toHaveBeenCalled();
    expect(engineState.instances).toHaveLength(0);
    expect(ready).toBe(false);
    vi.unstubAllGlobals();
  });

  it('trusts the claim when the bytes really are there', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const fetchStub = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchStub);

    expect(await asr.ensureBrowserASRReady()).toBe(true);

    expect(fetchStub).not.toHaveBeenCalled();
    expect(engineState.instances).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe('the encoder fallback chain', () => {
  it('drops from q4f16 to fp16 — still on the GPU — when the q4f16 session fails', async () => {
    engineState.failLoadForEncoder = 'q4f16';
    const asr = await loadWebgpuAsr();
    const { detectAsrBackend } = await import('@/lib/asr/browser');
    const registry = await import('@/lib/asr/browser/model-registry');
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    const ready1 = await asr.ensureBrowserASRReady();
    expect(ready1).toBe(false);
    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(asr.getBrowserASRStatusMessage()).toMatch(/FP16/i);

    expect(registry.hasNeverBeenPrompted()).toBe(true);
    expect(registry.getState().dialogVisible).toBe(true);
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('webgpu-fp16');
    expect(registry.getModelStatus('parakeet-ttd')?.estimatedSizeBytes).toBe(1_257_541_902);
    expect(await detectAsrBackend()).toBe('webgpu');

    await consentAndCache(PARAKEET_TDT_V3_WEBGPU_FP16);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16']);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });

  it('falls to the CPU model only after every WebGPU encoder has failed', async () => {
    engineState.failLoad = true;
    const asr = await loadWebgpuAsr();
    const { detectAsrBackend } = await import('@/lib/asr/browser');
    const registry = await import('@/lib/asr/browser/model-registry');
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    await asr.ensureBrowserASRReady();
    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('webgpu-fp16');
    expect(await detectAsrBackend()).toBe('webgpu');

    await consentAndCache(PARAKEET_TDT_V3_WEBGPU_FP16);
    await asr.ensureBrowserASRReady();
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16']);
    engineState.failLoad = false;
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16', 'int8']);
    expect(await detectAsrBackend()).toBe('wasm');
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('wasm-int8');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/transcribed after you stop/i);
    expect(lifecycle.consoleError()).toHaveBeenCalled();
  });

  it('does not walk the chain at all when the first rung works', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    expect(await asr.ensureBrowserASRReady()).toBe(true);

    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(asr.getBrowserASRPhase()).toBe('ready');
    expect(asr.shouldBufferForPostStop()).toBe(false);
    expect(asr.isPostStopTranscriptionOnly()).toBe(false);
  });

});
