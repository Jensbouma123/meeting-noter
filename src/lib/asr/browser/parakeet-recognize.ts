import type { ParakeetModel } from 'parakeet.js';
import { debugEnabled } from './quiet-console';
import { toBrowserWords } from './parakeet-segments';
import { WARMUP_SAMPLE_RATE } from './parakeet-loader';
import type { BrowserRecognizeResult } from './types';

export async function recognizeWindow(
  model: ParakeetModel,
  audio: Float32Array,
  onError: (message: string) => void,
): Promise<BrowserRecognizeResult> {
  try {
    const debug = debugEnabled();
    const result = await model.transcribe(audio, WARMUP_SAMPLE_RATE, {
      returnTimestamps: true,
      returnConfidences: true,
      enableProfiling: debug,
    });
    if (debug) console.debug('[asr-latency] metrics', result.metrics);
    const words = toBrowserWords(result.words ?? []);
    return { text: result.utterance_text.trim(), words, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onError(`Browser ASR transcription error: ${message}`);
    return { text: '', words: [], error: message };
  }
}
