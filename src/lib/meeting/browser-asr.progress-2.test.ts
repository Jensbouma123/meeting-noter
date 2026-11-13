import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

const lifecycle = installAsrTestLifecycle(engineState);

describe('model preparation progress', () => {
  it('drops the percentage on a failure, keeping the error message', async () => {
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();

    const failed = asr.getBrowserASRProgress();
    expect(failed.phase).toBe('failed');
    expect(failed.percent).toBeNull();
    expect(failed.stage).toBeNull();
    expect(asr.getBrowserASRStatusMessage()).toMatch(/session creation exploded/);
  });
  it('explains an out-of-memory load failure instead of surfacing the raw allocator text', async () => {
    engineState.failLoadMessage = 'Array buffer allocation failed';
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();

    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('failed');
    const message = asr.getBrowserASRStatusMessage() ?? '';
    expect(message).toMatch(/ran out of memory/i);
    expect(message).toMatch(/CPU-only/);
    expect(lifecycle.consoleError()).toHaveBeenCalled();
  });
  it('keeps one loaded model across recordings instead of rebuilding it', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(engineState.instances).toHaveLength(1);

    asr.resetBrowserASR();

    expect(asr.getBrowserASRPhase()).not.toBe('ready');
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('ready');
    expect(engineState.instances).toHaveLength(1);
  });
  it('has a frozen server snapshot, so hydration cannot mismatch', async () => {
    const asr = await loadBrowserAsr();
    const server = asr.getServerBrowserASRProgress();
    expect(server).toBe(asr.getServerBrowserASRProgress());
    expect(Object.isFrozen(server)).toBe(true);
    expect(server.phase).toBe('idle');
    expect(server.percent).toBeNull();
  });
});
