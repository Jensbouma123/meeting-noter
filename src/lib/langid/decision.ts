/** Turning raw per-window detections into the one language the UI shows. */
import { ASR_SUPPORTED_LANGUAGES } from './languages';
import type { LangIdPrediction } from './model';

/** Speech (not just audio) a window needs before its answer is believed. */
export const MIN_SPEECH_SAMPLES = 3 * 16_000;
/** A detection below this is noise, not a language. */
export const MIN_CONFIDENCE = 0.5;
/** A different language needs two agreeing detections to take over — unless one is this sure. */
export const SWITCH_CONFIDENCE = 0.8;

/**
 * The most likely language *the ASR can transcribe*. The confidence is the
 * full 99-way probability, not renormalised over the supported set: if the
 * audio is really Hausa, "Dutch with 3%" must read as low confidence, not be
 * inflated into a confident Dutch.
 */
export function pickSupportedLanguage(predictions: readonly LangIdPrediction[]): LangIdPrediction | undefined {
  return predictions.find((p) => ASR_SUPPORTED_LANGUAGES.has(p.code));
}

export interface Detection {
  code: string;
  confidence: number;
}

/** Hysteresis over successive detections (from every source): the shown
 *  language only changes on a confident, repeated or very sure disagreement. */
export function createLanguageSwitcher() {
  let current: Detection | undefined;
  let pending: string | undefined;
  return {
    offer(detection: Detection): Detection | undefined {
      if (detection.confidence < MIN_CONFIDENCE) return current;
      if (!current) {
        current = detection;
      } else if (detection.code === current.code) {
        current = detection;
        pending = undefined;
      } else if (detection.confidence >= SWITCH_CONFIDENCE || pending === detection.code) {
        current = detection;
        pending = undefined;
      } else {
        pending = detection.code;
      }
      return current;
    },
    get current(): Detection | undefined {
      return current;
    },
    reset(): void {
      current = undefined;
      pending = undefined;
    },
  };
}
