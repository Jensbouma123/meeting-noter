import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { voice } from '@/lib/asr/test-signals';
import { lowConfidenceSpans } from './asr/low-confidence';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('the overlap second pass on the live engine', () => {
  function frame(index: number): ArrayBuffer {
    return Int16Array.from(voice(1600, 0.3, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }
  const turns = [
    { speaker: 'mic:0', start: 0, end: 3, final: true },
    { speaker: 'mic:1', start: 1, end: 3, final: true },
  ];

  async function overlapped() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = { ...(await import('./session-reset')), ...(await import('./store-core')) };
    store.resetSession('both');
    const overlap = await import('./overlap-retranscribe');
    for (let i = 0; i < 50; i += 1) overlap.pushOverlapAudio('mic', frame(i), i * 1600);
    overlap.noteOverlapTurns('mic', turns);
    engineState.recognized.length = 0;
    engineState.words = () => [{ text: 'overlapped', start: 0.5, end: 0.9 }];
    return { asr, store, overlap };
  }

  it('re-reads an overlap after it ends, on the loaded engine, and adds the missed words', async () => {
    const { store, overlap } = await overlapped();
    await overlap.flushOverlapRetranscribe();
    expect(engineState.recognized).toHaveLength(1);
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['overlapped', true]]);
  });

  it('caps the clip it hands the engine', async () => {
    const { asr, overlap } = await overlapped();
    overlap.resetOverlapRetranscribe();
    for (let i = 0; i < 200; i += 1) overlap.pushOverlapAudio('mic', frame(i), i * 1600);
    overlap.noteOverlapTurns('mic', [
      { speaker: 'mic:0', start: 0, end: 15, final: true },
      { speaker: 'mic:1', start: 1, end: 15, final: true },
    ]);
    await overlap.flushOverlapRetranscribe();
    expect(engineState.recognized).toHaveLength(1);
    expect(engineState.recognized[0].samples).toBe(asr.OVERLAP_CLIP_MAX_SECONDS * 16000);
  });

  it('is skipped while a live window is running, and never delays it', async () => {
    const { asr, store, overlap } = await overlapped();
    let release!: () => void;
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 30; i += 1) asr.pushLiveAudio('mic', frame(100 + i), (100 + i) * 1600);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));

    const pass = overlap.flushOverlapRetranscribe(5000);
    await new Promise((r) => setTimeout(r, 1200));
    engineState.hold = null;
    release();
    await pass;
    expect(engineState.recognized).toHaveLength(1);
    expect(store.getState().segments.some((s) => s.id.startsWith('ovl-'))).toBe(false);
  });
});

describe('lowConfidenceSpans', () => {
  it('spans each word under 0.65 at its character offsets, one span per run', () => {
    const text = 'we ship the the release friday';
    const words = [
      { text: 'we', start: 0, end: 1, confidence: 0.99 },
      { text: 'ship', start: 1, end: 2, confidence: 0.4 },
      { text: 'the', start: 2, end: 3, confidence: 0.9 },
      { text: 'the', start: 3, end: 4, confidence: 0.5 },
      { text: 'release', start: 4, end: 5, confidence: 0.2 },
      { text: 'friday', start: 5, end: 6, confidence: 0.95 },
    ];
    expect(lowConfidenceSpans(text, words)).toEqual([
      [3, 7, 0.4],
      [12, 15, 0.5],
      [16, 23, 0.2],
    ]);
  });

  it('skips words without confidence and words it cannot locate', () => {
    expect(
      lowConfidenceSpans('hello world', [
        { text: 'hello', start: 0, end: 1 },
        { text: 'missing', start: 1, end: 2, confidence: 0.1 },
      ]),
    ).toEqual([]);
  });
});
