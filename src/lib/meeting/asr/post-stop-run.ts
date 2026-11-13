import { CAPTURE_SAMPLE_RATE } from '../pcm';
import { clearPostStopCapture, hasBufferedAudio } from '../post-stop-buffer';
import { getPostStopProgress } from '../post-stop-progress';
import { transcribeRecordedAudio } from '../post-stop-transcription';
import type { PostStopProgress } from '../types/post-stop';
import type { AsrEngine } from '@/lib/asr/browser';
import type { Source } from '../types/basics';
import { POST_STOP_MIN_PART_SAMPLES } from './constants';
import { asrState } from './state';
import { acquireEngine } from './engine-acquire';
import { getRecordingTranscriptionMode } from './recording-mode';
import { isPostStopTranscriptionOnly } from './backend';

async function transcribePart(
  engine: AsrEngine,
  source: Source,
  part: Float32Array,
  partStart: number,
  isFinal: boolean,
): Promise<void> {
  asrState.windowInFlight = { source, startSample: partStart, samples: part.length };
  try {
    const result = await engine.transcribe(part, source, asrState.speakerLabeler(source, part), isFinal);
    if (result.error) {
      throw new Error(result.error);
    }
  } finally {
    asrState.windowInFlight = null;
  }
}

async function transcribeWindowBySpeaker(
  engine: AsrEngine,
  audio: Float32Array,
  source: Source,
  isFinal: boolean,
  startSample: number,
): Promise<void> {
  const cuts = asrState.speakerTimeline?.changePoints(
    source,
    startSample / CAPTURE_SAMPLE_RATE,
    (startSample + audio.length) / CAPTURE_SAMPLE_RATE,
  ) ?? [];
  let from = 0;
  for (const cut of cuts) {
    const at = Math.round(cut * CAPTURE_SAMPLE_RATE) - startSample;
    if (at - from < POST_STOP_MIN_PART_SAMPLES || audio.length - at < POST_STOP_MIN_PART_SAMPLES) continue;
    await transcribePart(engine, source, audio.subarray(from, at), startSample + from, true);
    from = at;
  }
  await transcribePart(engine, source, audio.subarray(from), startSample + from, isFinal);
}

export async function transcribeRecordedAudioAfterStop(): Promise<boolean> {
  if (getRecordingTranscriptionMode() !== 'post-stop') return false;
  if (!hasBufferedAudio()) {
    return transcribeRecordedAudio(async () => {});
  }
  const engine = await acquireEngine();
  if (engine === null || !engine.isReady) {
    console.error('[asr] The recorded audio could not be transcribed — no model');
    clearPostStopCapture();
    return false;
  }
  const ok = await transcribeRecordedAudio((audio, source, isFinal, startSample) =>
    transcribeWindowBySpeaker(engine, audio, source, isFinal, startSample),
  );
  if (!ok) {
    const reason = getPostStopProgress().error;
    console.error('[asr] Transcribing the recorded audio failed', reason ?? 'unknown error');
  }
  return ok;
}

export function getPostStopTranscriptionProgress(): PostStopProgress | null {
  return isPostStopTranscriptionOnly() ? getPostStopProgress() : null;
}
