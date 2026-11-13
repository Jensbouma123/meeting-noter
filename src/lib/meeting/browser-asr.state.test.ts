import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

const lifecycle = installAsrTestLifecycle(engineState);

describe('browser ASR is reachable', () => {
  it('is enabled by default — nothing has to switch it on for Record to work', async () => {
    const asr = await loadBrowserAsr();
    expect(asr.getBrowserASREnabled()).toBe(true);
    expect(asr.getBrowserASRPhase()).not.toBe('disabled');
  });

  it('transcribes once the model is ready, so frames reach the transcript', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const { getState } = await import('./store-core');

    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('ready');

    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(true);
    expect(getState().segments.map((s) => s.text)).toEqual(['hello there']);
    expect(lifecycle.consoleError()).not.toHaveBeenCalled();
  });
});

describe('a model that cannot be used is visible, not silent', () => {
  it('reports a blocked phase with an actionable message when consent is missing', async () => {
    const asr = await loadBrowserAsr();

    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('blocked');
    const message = asr.getBrowserASRStatusMessage();
    expect(message).toMatch(/not been downloaded/i);
    expect(engineState.instances).toHaveLength(0);
  });

  it('does not re-notify subscribers for every dropped frame while blocked', async () => {
    const asr = await loadBrowserAsr();
    let notifications = 0;
    const unsubscribe = asr.subscribeBrowserASR(() => {
      notifications += 1;
    });

    for (let i = 0; i < 5; i += 1) {
      await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false);
    }
    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('blocked');
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it('surfaces a load failure as failed state with the underlying message, and logs it', async () => {
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();

    expect(await asr.ensureBrowserASRReady()).toBe(false);

    expect(asr.getBrowserASRPhase()).toBe('failed');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/session creation exploded/);
    expect(lifecycle.consoleError()).toHaveBeenCalled();
  });

  it('surfaces an inference failure instead of silently dropping every later frame', async () => {
    engineState.failTranscribe = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();

    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    expect(asr.getBrowserASRPhase()).toBe('failed');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/inference exploded/);
    expect(lifecycle.consoleError()).toHaveBeenCalled();
  });
});
