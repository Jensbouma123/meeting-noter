import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import type { BrowserASRStatus } from './status';
import type { BrowserRecognizeResult, BrowserTranscribeResult } from './result';

export interface AsrEngine {
  readonly isReady: boolean;
  getStatus(): BrowserASRStatus;
  ensureLoaded(): Promise<void>;
  transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult>;
  recognize(audio: Float32Array): Promise<BrowserRecognizeResult>;
  stop(): Promise<void>;
  disable(): void;
  lockLanguage(): void;
  unlockLanguage(): void;
  setLanguageHint(code: string | null): void;
  setVocabulary(config: VocabularyBiasConfig): void;
}
