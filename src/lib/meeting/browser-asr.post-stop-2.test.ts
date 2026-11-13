import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr, loadWebgpuAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);

describe('post-stop transcription on a CPU-only device', () => {
  function frame(value = 16384): ArrayBuffer {
    return Int16Array.from({ length: 1600 }, () => value).buffer;
  }

  async function loadPostStopAsr() {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.resolveAsrBackend();
    return asr;
  }

  it('drops the buffered audio when the model cannot load', async () => {
    const asr = await loadPostStopAsr();
    engineState.failLoad = true;

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());
    const { hasBufferedAudio } = await import('./post-stop-buffer');
    expect(hasBufferedAudio()).toBe(true);

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(hasBufferedAudio()).toBe(false);
  });
});

describe('the transcription mode of a recording', () => {
  function frame(value = 16384): ArrayBuffer {
    return Int16Array.from({ length: 1600 }, () => value).buffer;
  }

  it('sends frames held before the probe answered to the live path on a WebGPU device', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    const { bufferedSeconds } = await import('./post-stop-buffer');

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 5; i += 1) asr.bufferRecordedAudio('mic', frame(), i * 1600);
    expect(asr.getRecordingTranscriptionMode()).toBeNull();
    expect(engineState.instances).toHaveLength(0);

    expect(await asr.resolveAsrBackend()).toBe('webgpu');

    expect(asr.getRecordingTranscriptionMode()).toBe('live');
    expect(bufferedSeconds().mic ?? 0).toBe(0);
    await vi.waitFor(() => expect(engineState.instances).toHaveLength(1));
  });

  it('keeps a live recording live on Stop after the device fell to the CPU model', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    asr.beginRecordedAudioCapture();
    expect(asr.getRecordingTranscriptionMode()).toBe('live');

    asr.retryCrashedLoadWithSmallerModel();
    await asr.resolveAsrBackend();
    expect(asr.isPostStopTranscriptionOnly()).toBe(true);

    asr.bufferRecordedAudio('mic', frame());
    expect(asr.getRecordingTranscriptionMode()).toBe('live');
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(engineState.transcribed).toHaveLength(0);
  });
});

describe('post-stop transcription with speaker turns', () => {
  it('cuts a window where the speaker changes and labels each part from its own span', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.resolveAsrBackend();
    const { getState } = await import('./store-core');
    const { resetSession } = await import('./session-reset');
    resetSession('system');
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => ((start + end) / 2 < 20 ? 'system:0' : 'system:1'),
      speakerNear: (_source, start, end) => ((start + end) / 2 < 20 ? 'system:0' : 'system:1'),
      changePoints: (_source, start, end) => [20].filter((t) => t > start && t < end),
      turnEnds: () => [],
    });

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 300; i += 1) {
      asr.bufferRecordedAudio('system', Int16Array.from({ length: 1600 }, () => 8192).buffer);
    }
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    expect(engineState.transcribed.map((t) => t.samples)).toEqual([20 * 16_000, 10 * 16_000]);
    expect(getState().segments.map((seg) => [seg.start, seg.end, seg.speaker])).toEqual([
      [0, 20, 'system:0'],
      [20, 30, 'system:1'],
    ]);
  });
});
