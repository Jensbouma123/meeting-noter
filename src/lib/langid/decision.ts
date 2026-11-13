import { ASR_SUPPORTED_LANGUAGES } from './languages';
import type { LangIdPrediction } from './types';

export const MIN_SPEECH_SAMPLES = 3 * 16_000;
export const MIN_CONFIDENCE = 0.5;
export const SWITCH_CONFIDENCE = 0.8;

export function pickSupportedLanguage(predictions: readonly LangIdPrediction[]): LangIdPrediction | undefined {
  return predictions.find((p) => ASR_SUPPORTED_LANGUAGES.has(p.code));
}

export interface Detection {
  code: string;
  confidence: number;
}

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
