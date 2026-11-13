import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest';
import { voice } from '@/lib/asr/test-signals';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('Stop flush of the live windows', () => {
  function speech(index: number, level = 0.3): ArrayBuffer {
    return Int16Array.from(voice(1600, level, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }

  async function readyWebgpuAsr() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = await import('./store');
    store.resetSession('mic');
    return { asr, store };
  }

  it('transcribes every buffered second on Stop, not only the first 10 s window', async () => {
    const { asr, store } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 180; i += 1) asr.pushLiveAudio('mic', speech(i));
    expect(engineState.recognized).toHaveLength(1);

    engineState.words = (s) =>
      Array.from({ length: Math.floor(s / 0.5) }, (_, i) => ({ text: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
    const flushed = asr.flushLiveAudio();
    engineState.hold = null;
    release();
    await flushed;

    const segments = store.getState().segments;
    expect(segments.every((s) => s.final)).toBe(true);
    expect(Math.max(...segments.map((s) => s.end))).toBeGreaterThan(17);
  });

  it('reports progress while the flush runs, and clears it after', async () => {
    const { asr } = await readyWebgpuAsr();
    const progress = await import('./live-flush-progress');
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 40; i += 1) asr.pushLiveAudio('mic', speech(i));

    const flushed = asr.flushLiveAudio();
    expect(progress.getLiveFlushProgress()).toEqual({ done: 0, total: 40 * 1600 });
    engineState.hold = null;
    release();
    await flushed;
    expect(progress.getLiveFlushProgress()).toBeNull();
  });

  it('closes the open segment when its last window outlives the flush, and drops that late result', async () => {
    const { asr, store } = await readyWebgpuAsr();
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', false]]));

    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    engineState.words = () => [
      { text: 'hello', start: 0.1, end: 0.5 },
      { text: 'late', start: 2, end: 2.5 },
    ];
    for (let i = 15; i < 30; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));

    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const flushed = asr.flushLiveAudio();
      await vi.advanceTimersByTimeAsync(asr.LIVE_FLUSH_WAIT_MS + 1000);
      await flushed;
    } finally {
      vi.useRealTimers();
    }
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', true]]);

    engineState.hold = null;
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', true]]);
  });
});
