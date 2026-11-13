import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { voice } from '@/lib/asr/test-signals';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('live audio windows', () => {
  function speech(index: number, level = 0.3): ArrayBuffer {
    return Int16Array.from(voice(1600, level, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }
  function silence(): ArrayBuffer {
    return new Int16Array(1600).buffer;
  }
  function peakOf(frames: ArrayBuffer[]): number {
    return frames.reduce((m, f) => new Int16Array(f).reduce((n, x) => Math.max(n, Math.abs(x) / 32768), m), 0);
  }

  async function readyWebgpuAsr() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = { ...(await import('./session-reset')), ...(await import('./store-core')) };
    store.resetSession('both');
    return { asr, store };
  }

  it('batches 100 ms frames into windows of correctly scaled Float32: a fast first take, then 1.5 s steps', async () => {
    const { asr } = await readyWebgpuAsr();

    const frames = Array.from({ length: 30 }, (_, i) => speech(i));
    let n = 0;
    while (engineState.recognized.length === 0 && n < 14) asr.pushLiveAudio('mic', frames[n++]);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    expect(n).toBeLessThan(15);
    expect(engineState.recognized[0].samples).toBe(n * 1600);
    expect(peakOf(frames)).toBeGreaterThan(0.3);
    expect(engineState.recognized[0].peak).toBeCloseTo(peakOf(frames.slice(0, n)), 5);

    const first = n;
    for (; n < first + 14; n += 1) asr.pushLiveAudio('mic', frames[n]);
    await new Promise((r) => setTimeout(r, 20));
    expect(engineState.recognized).toHaveLength(1);
    asr.pushLiveAudio('mic', frames[n]);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    expect(engineState.recognized[1].samples).toBe((first + 15) * 1600);
  });
  it('never sends silence to the model', async () => {
    const { asr, store } = await readyWebgpuAsr();
    for (let i = 0; i < 100; i += 1) asr.pushLiveAudio('mic', silence());
    await asr.flushLiveAudio();
    expect(engineState.recognized).toHaveLength(0);
    expect(store.getState().segments).toEqual([]);
  });
  it('re-reads the open utterance, updating one segment instead of adding fragments', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = (s) => [
      { text: 'hello', start: 0.1, end: 0.6 },
      { text: 'there', start: 1.4, end: 2.0 },
    ].filter((w) => w.end <= s);

    for (let i = 0; i < 30; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    expect(engineState.recognized[1].samples).toBe(30 * 1600);
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello there', false]]);
  });
  it('closes the segment at a pause and flushes the tail on Stop', async () => {
    const { asr, store } = await readyWebgpuAsr();

    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 7; i += 1) asr.pushLiveAudio('mic', silence());
    await vi.waitFor(() => expect(store.getState().segments.filter((s) => s.final)).toHaveLength(1));

    for (let i = 0; i < 5; i += 1) asr.pushLiveAudio('mic', speech(i, 0.15));
    await asr.flushLiveAudio();
    const segments = store.getState().segments;
    expect(segments.map((s) => [s.text, s.final])).toEqual([
      ['hello', true],
      ['hello', true],
    ]);
    expect(engineState.recognized.at(-1)?.samples).toBeGreaterThanOrEqual(5 * 1600);
  });
  it('turns an empty or punctuation-only result into no segment at all', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = () => [{ text: '.', start: 0.1, end: 0.2 }];
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 7; i += 1) asr.pushLiveAudio('mic', silence());
    await asr.flushLiveAudio();
    expect(engineState.recognized.length).toBeGreaterThan(0);
    expect(store.getState().segments).toEqual([]);
  });
  it('serves both sources, and tags each segment with the source it came from', async () => {
    const { asr, store } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));

    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 15; i += 1) {
      asr.pushLiveAudio('system', speech(i));
      asr.pushLiveAudio('mic', speech(15 + i));
    }
    expect(engineState.recognized).toHaveLength(1);
    engineState.hold = null;
    release();

    await vi.waitFor(() => expect(engineState.recognized.length).toBeGreaterThanOrEqual(2));
    expect(engineState.recognized[1].samples).toBe(15 * 1600);
    await vi.waitFor(() =>
      expect(new Set(store.getState().segments.map((s) => s.source))).toEqual(new Set(['mic', 'system'])),
    );
    for (const seg of store.getState().segments) expect(seg.speaker.startsWith(seg.source)).toBe(true);
  });
});
