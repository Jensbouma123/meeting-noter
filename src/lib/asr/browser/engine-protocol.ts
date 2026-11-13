/** Messages between `engine-client.ts` (page) and `engine-worker.ts` (the
 *  worker that owns the speech model). Types only — imported by both sides. */
import type {
  BrowserASRConfig,
  BrowserASRLoadProgress,
  BrowserASRStatus,
  BrowserLanguageInfo,
  BrowserRecognizeResult,
  BrowserSegment,
  BrowserTranscribeResult,
} from './types';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';

export interface TranscribeArgs {
  audio: Float32Array;
  source: 'mic' | 'system';
  speakerLabel: string;
  isFinal: boolean;
}

export type EngineCall =
  | { method: 'ensureLoaded' }
  | { method: 'transcribe'; args: TranscribeArgs }
  | { method: 'recognize'; args: { audio: Float32Array } }
  | { method: 'stop' }
  | { method: 'lockLanguage' }
  | { method: 'unlockLanguage' }
  | { method: 'setLanguageHint'; args: { code: string | null } }
  | { method: 'setVocabulary'; args: VocabularyBiasConfig };

export type EngineWorkerIn =
  | { type: 'init'; config: BrowserASRConfig; debug: boolean }
  | ({ type: 'call'; callId: number } & EngineCall);

export type EngineWorkerOut =
  /** Posted once, as the worker starts: whether WebGPU exists in *this*
   *  scope — the page's adapter probe says nothing about a worker's. */
  | { type: 'hello'; webgpu: boolean }
  | { type: 'status'; status: BrowserASRStatus; ready: boolean }
  | { type: 'segment'; segment: BrowserSegment }
  | { type: 'language'; language: BrowserLanguageInfo }
  | { type: 'error'; message: string }
  | { type: 'loadProgress'; progress: BrowserASRLoadProgress }
  | {
      type: 'reply';
      callId: number;
      ready: boolean;
      ok: boolean;
      value?: BrowserTranscribeResult | BrowserRecognizeResult;
      error?: string;
    };
