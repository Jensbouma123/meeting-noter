import type { SerializedSpeakerState } from './speaker-state';
import type { Source } from './source';
import type { SpeakerTurn } from './speaker-turn';

export interface DiarizerOptions {
  source: Source;
  speakerState?: SerializedSpeakerState;
}

export interface DiarizerReady {
  backend: 'webgpu' | 'wasm';
}

export type DiarizerErrorCode = 'not-cached' | 'failed';

export interface Diarizer {
  push(chunk: Float32Array, startSample?: number): void;
  flush(timeoutMs?: number): Promise<void>;
  onSpeakerTurn(cb: (turn: SpeakerTurn) => void): () => void;
  onError(cb: (message: string, code: DiarizerErrorCode) => void): () => void;
  onReady(cb: (info: DiarizerReady) => void): () => void;
  dispose(): void;
}
