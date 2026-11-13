import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('model preparation progress', () => {
  it('walks a real percentage through initialization and lands on 100 = ready', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();

    const seen: Array<{ phase: string; percent: number | null; label: string | null }> = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      const p = asr.getBrowserASRProgress();
      seen.push({ phase: p.phase, percent: p.percent, label: p.label });
    });

    expect(asr.getBrowserASRProgress().percent).toBeNull();

    await asr.ensureBrowserASRReady();

    const loading = seen.filter((s) => s.phase === 'loading');
    expect(loading.length).toBeGreaterThan(1);
    const percents = [...new Set(loading.flatMap((s) => (s.percent === null ? [] : [s.percent])))];
    expect(percents.length).toBeGreaterThan(2);
    for (let i = 1; i < percents.length; i += 1) {
      expect(percents[i]).toBeGreaterThan(percents[i - 1]);
    }
    expect(Math.max(...percents)).toBeLessThan(100);
    expect(loading.every((s) => s.label?.startsWith('Initializing model'))).toBe(true);

    const done = asr.getBrowserASRProgress();
    expect(done.phase).toBe('ready');
    expect(done.percent).toBe(100);
    expect(done.stage).toBeNull();
    expect(done.label).toBeNull();
    unsubscribe();
  });
  it('is indeterminate, with the stage named, when the engine reports no file list', async () => {
    engineState.load = { files: 0, hold: false };
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const seen: Array<{ percent: number | null; detail: string | null }> = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      const p = asr.getBrowserASRProgress();
      if (p.phase === 'loading') seen.push({ percent: p.percent, detail: p.detail });
    });

    await asr.ensureBrowserASRReady();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some((s) => s.percent === null && s.detail !== null)).toBe(true);
    unsubscribe();
  });
  it('reports the download as real bytes, and stops reporting it once cached', async () => {
    const asr = await loadBrowserAsr();
    const registry = await import('@/lib/asr/browser/model-registry');
    registry.recordConsent('accepted', ['parakeet-ttd']);
    const entry = registry.getModelStatus('parakeet-ttd');
    expect(entry).toBeDefined();

    entry!.status = 'downloading';
    registry.updateProgress('parakeet-ttd', 512, 1024, 'encoder-model.int8.onnx', 0, 0);

    const downloading = asr.getBrowserASRProgress();
    expect(downloading.phase).toBe('downloading');
    expect(downloading.stage).toBe('downloading');
    expect(downloading.percent).toBe(50);
    expect(downloading.label).toBe('Downloading model 50%');

    registry.updateProgress('parakeet-ttd', 512, 1024, 'encoder-model.int8.onnx', 0, 0, true);
    const resuming = asr.getBrowserASRProgress();
    expect(resuming.percent).toBeNull();
    expect(resuming.label).toBe('Downloading model');
    expect(resuming.detail).toBe('Resuming download');

    registry.updateProgress('parakeet-ttd', 1024, 1024, '', 0, 0);
    registry.markCached('parakeet-ttd');
    expect(asr.getBrowserASRProgress().stage).not.toBe('downloading');
  });
  it('hands out a stable snapshot between changes, and a fresh one when a stage lands', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();

    const before = asr.getBrowserASRProgress();
    expect(asr.getBrowserASRProgress()).toBe(before);

    const snapshots: unknown[] = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      snapshots.push(asr.getBrowserASRProgress());
    });
    await asr.ensureBrowserASRReady();
    unsubscribe();

    expect(snapshots.length).toBeGreaterThan(2);
    for (let i = 1; i < snapshots.length; i += 1) {
      expect(snapshots[i]).not.toBe(snapshots[i - 1]);
    }
  });
  it('never lets a retry inherit the previous attempt’s progress', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(asr.getBrowserASRProgress().percent).toBe(100);

    asr.resetBrowserASR();

    const afterReset = asr.getBrowserASRProgress();
    expect(afterReset.phase).not.toBe('ready');
    expect(afterReset.percent).toBeNull();
    expect(afterReset.stage).toBeNull();
  });
});
