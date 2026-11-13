import type { Source } from '../types/basics';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { recordFailure } from './state-updates';
import { acquireEngine } from './engine-acquire';

export async function tryBrowserASR(
  audio: Float32Array,
  source: Source,
  isFinal: boolean,
  startSample?: number,
): Promise<boolean> {
  if (!asrState.enabled) return false;

  const engine = asrState.engine?.isReady ? asrState.engine : null;
  if (!engine) {
    void acquireEngine();
    return false;
  }

  if (asrState.transcribeInFlight) return false;
  asrState.transcribeInFlight = true;
  asrState.windowInFlight = startSample === undefined ? null : { source, startSample, samples: audio.length };

  try {
    const result = await engine.transcribe(audio, source, asrState.speakerLabeler(source, audio), isFinal);
    if (result.error) {
      console.error('[asr] Transcription failed', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[asr] Transcription threw', err);
    recordFailure('transcribe', `Could not transcribe audio: ${err instanceof Error ? err.message : String(err)}`);
    notifyBrowserListeners();
    return false;
  } finally {
    asrState.transcribeInFlight = false;
    asrState.windowInFlight = null;
  }
}
