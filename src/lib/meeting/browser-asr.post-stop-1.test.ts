import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadBrowserAsr } from './asr-test-setup';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

const lifecycle = installAsrTestLifecycle(engineState);

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

  it('says live transcription is not supported, and still records', async () => {
    const asr = await loadPostStopAsr();

    expect(asr.isPostStopTranscriptionOnly()).toBe(true);
    expect(asr.shouldBufferForPostStop()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('post-stop');
    expect(asr.getBrowserASRStatusMessage()).toBe(
      'Live transcription is not supported on this device - the recording will be transcribed after you stop',
    );

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 5; i += 1) asr.bufferRecordedAudio('mic', frame());
    const { bufferedSeconds } = await import('./post-stop-buffer');
    expect(bufferedSeconds().mic).toBeCloseTo(0.5, 5);
  });
  it('transcribes the buffered recording on Stop, with real progress and real audio', async () => {
    const asr = await loadPostStopAsr();
    const { getState } = await import('./store-core');
    const { getPostStopTranscriptionProgress } = asr;

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 650; i += 1) asr.bufferRecordedAudio('mic', frame());

    const seen: number[] = [];
    const unsubscribe = asr.subscribePostStopTranscription(() => {
      const p = getPostStopTranscriptionProgress();
      if (p?.percent !== null && p?.percent !== undefined) seen.push(p.percent);
    });

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    unsubscribe();

    expect(engineState.encoderQuants).toEqual(['int8']);
    expect(engineState.transcribed).toHaveLength(2);
    expect(engineState.transcribed.every((t) => t.isFinal)).toBe(true);
    expect(engineState.transcribed[0].firstSample).toBeCloseTo(0.5, 5);
    expect(engineState.transcribed[0].samples).toBe(60 * 16_000);
    expect(engineState.transcribed[1].samples).toBe(Math.round(5.5 * 16_000));

    expect(seen).toContain(0);
    expect(seen).toContain(50);
    expect(seen).toContain(100);
    const progress = getPostStopTranscriptionProgress();
    expect(progress?.phase).toBe('done');
    expect(progress?.chunksTotal).toBe(2);
    expect(getState().segments.filter((s) => s.final)).toHaveLength(2);
    expect(lifecycle.consoleError()).not.toHaveBeenCalled();
  });
  it('releases the buffer after transcribing, so a stop cannot duplicate a transcript', async () => {
    const asr = await loadPostStopAsr();
    const { bufferedSeconds } = await import('./post-stop-buffer');

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    expect(bufferedSeconds().mic).toBeUndefined();

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    expect(engineState.transcribed).toHaveLength(1);
  });
  it('keeps each source separate, so a two-source recording is not one voice', async () => {
    const asr = await loadPostStopAsr();

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame(16384));
    asr.bufferRecordedAudio('system', frame(-16384));

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    expect(engineState.transcribed.map((t) => t.source)).toEqual(['mic', 'system']);
    expect(engineState.transcribed[0].firstSample).toBeCloseTo(0.5, 5);
    expect(engineState.transcribed[1].firstSample).toBeCloseTo(-0.5, 5);
  });
  it('does not transcribe anything, or claim to, when no audio was recorded', async () => {
    const asr = await loadPostStopAsr();

    asr.beginRecordedAudioCapture();
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    expect(engineState.instances).toHaveLength(0);
    expect(asr.getPostStopTranscriptionProgress()?.phase).toBe('done');
  });
  it('reports a failure instead of losing the transcript silently', async () => {
    const asr = await loadPostStopAsr();
    engineState.failTranscribe = true;

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(asr.getPostStopTranscriptionProgress()?.phase).toBe('error');
    expect(lifecycle.consoleError()).toHaveBeenCalled();
  });
});
