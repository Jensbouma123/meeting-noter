import type { TimedWord } from '@/lib/asr/types';
import { CAPTURE_SAMPLE_RATE } from '../pcm';
import { OVERLAP_CLIP_MAX_SECONDS, OVERLAP_CLIP_WAIT_MS } from './constants';
import { asrState } from './state';
import { liveBusy } from './live-state';
import { getRecordingTranscriptionMode } from './recording-mode';
import { pumpLiveAudio } from './live-pump';

export async function recognizeOverlapClip(audio: Float32Array): Promise<TimedWord[]> {
  if (getRecordingTranscriptionMode() === 'post-stop') return [];
  const deadline = Date.now() + OVERLAP_CLIP_WAIT_MS;
  while (liveBusy() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const engine = asrState.engine?.isReady ? asrState.engine : null;
  if (!engine || liveBusy()) return [];
  const clip = audio.length > OVERLAP_CLIP_MAX_SECONDS * CAPTURE_SAMPLE_RATE
    ? audio.subarray(0, OVERLAP_CLIP_MAX_SECONDS * CAPTURE_SAMPLE_RATE)
    : audio;
  asrState.transcribeInFlight = true;
  try {
    const result = await engine.recognize(clip);
    return result.error ? [] : result.words;
  } catch (err) {
    console.warn('[asr] Overlap clip failed', err);
    return [];
  } finally {
    asrState.transcribeInFlight = false;
    pumpLiveAudio();
  }
}
