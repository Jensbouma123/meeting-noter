import type * as ort from 'onnxruntime-web';
import type { SampleRing } from './ring-buffer';

export interface LangIdModel {
  encoder: ort.InferenceSession;
  decoder: ort.InferenceSession;
  backend: 'webgpu' | 'wasm';
}

export interface LangIdPrediction {
  code: string;
  confidence: number;
}

export interface Detection {
  code: string;
  confidence: number;
}

export type DownloadProgressHandler = (loaded: number, total: number, file: string) => void;

export interface LanguageResult {
  code: string;
  name: string;
  confidence: number;
}

export interface LanguageDetector {
  push(samples: Float32Array, transfer?: boolean): void;
  onLanguage(cb: (result: LanguageResult) => void): () => void;
  onError(cb: (message: string) => void): () => void;
  dispose(): void;
}

export type WorkerInMessage =
  | { type: 'init'; id: string }
  | { type: 'push'; id: string; samples: Float32Array }
  | { type: 'dispose'; id: string };

export type WorkerOutMessage =
  | { type: 'language'; id: string; code: string; name: string; confidence: number }
  | { type: 'progress'; id: string; loaded: number; total: number; file: string }
  | { type: 'error'; id: string; message: string };

export interface SourceState {
  window: SampleRing;
  samplesSinceLastRun: number;
  hasRunOnce: boolean;
  recheckAfterSamples: number;
  running: boolean;
}

export interface PostedMessage {
  type: string;
  id: string;
  code?: string;
  message?: string;
}
