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

describe('live audio windows', () => {
  function speech(index: number, level = 0.3): ArrayBuffer {
    return Int16Array.from(voice(1600, level, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }

  async function readyWebgpuAsr() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = await import('./store');
    store.resetSession('both');
    return { asr, store };
  }

  it('serves a source that has shown nothing yet before the other source\'s update', async () => {
    const { asr } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));

    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    engineState.hold = null;
    release();
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(15 + i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    for (let i = 0; i < 18; i += 1) asr.pushLiveAudio('mic', speech(30 + i));
    for (let i = 0; i < 12; i += 1) asr.pushLiveAudio('system', speech(i));
    engineState.hold = null;
    release();
    await vi.waitFor(() => expect(engineState.recognized.length).toBeGreaterThanOrEqual(3));
    expect(engineState.recognized[2].firstSample).toBe(new Int16Array(speech(0))[0] / 32768);
  });
  it('places segments on the capture clock and takes the speaker diarization gives that span', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = () => [{ text: 'hello', start: 0.5, end: 1.0 }];
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => (start >= 30 && end <= 33 ? 'mic:1' : null),
      speakerNear: (_source, start, end) => (start >= 30 && end <= 33 ? 'mic:1' : null),
      changePoints: () => [],
      turnEnds: () => [],
    });

    for (let i = 0; i < 25; i += 1) asr.pushLiveAudio('mic', speech(300 + i), (300 + i) * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(1));

    const [seg] = store.getState().segments;
    expect(seg.start).toBe(30.5);
    expect(seg.end).toBe(31);
    expect(seg.speaker).toBe('mic:1');
  });
  it('closes the open segment once a speaker turn ends inside it', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = (sec) =>
      [
        { text: 'mine', start: 0.2, end: 0.8 },
        { text: 'yours', start: 2.6, end: 3.2 },
      ].filter((w) => w.end <= sec);
    asr.setSpeakerTimeline({
      speakerFor: (_source, start) => (start < 2.5 ? 'mic:0' : 'mic:1'),
      speakerNear: (_source, start) => (start < 2.5 ? 'mic:0' : 'mic:1'),
      changePoints: () => [],
      turnEnds: (_source, start, end) => [2.5].filter((t) => t > start && t < end),
    });

    for (let i = 0; i < 21; i += 1) asr.pushLiveAudio('mic', speech(i), i * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(1));
    expect(store.getState().segments[0].final).toBe(false);
    for (let i = 21; i < 40; i += 1) asr.pushLiveAudio('mic', speech(i), i * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(2));
    expect(store.getState().segments.map((s) => [s.text, s.final, s.speaker])).toEqual([
      ['mine', true, 'mic:0'],
      ['yours', false, 'mic:1'],
    ]);
  });
});
