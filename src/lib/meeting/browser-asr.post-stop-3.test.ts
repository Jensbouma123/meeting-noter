import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('post-stop words', () => {
  it('splits a part per word where the speaker changes inside it', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.resolveAsrBackend();
    const { getState, resetSession } = await import('./store');
    resetSession('system');
    engineState.transcribeWords = [
      { text: 'one', start: 1, end: 2 },
      { text: 'two', start: 3, end: 4 },
      { text: 'three', start: 12, end: 13 },
    ];
    const at = (start: number, end: number) => ((start + end) / 2 < 10 ? 'system:0' : 'system:1');
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => at(start, end),
      speakerNear: (_source, start, end) => at(start, end),
      changePoints: () => [],
      turnEnds: () => [],
    });
    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 300; i += 1) {
      asr.bufferRecordedAudio('system', Int16Array.from({ length: 1600 }, () => 8192).buffer);
    }
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    engineState.transcribeWords = null;
    expect(getState().segments.map((seg) => [seg.text, seg.speaker])).toEqual([
      ['one two', 'system:0'],
      ['three', 'system:1'],
    ]);
  });
});
