import type { DiarizerErrorCode, DiarizerReady } from './diarizer';
import type { SerializedSpeakerState } from './speaker-state';
import type { Source } from './source';
import type { SpeakerTurn } from './speaker-turn';

export type WorkerInMessage =
  | { type: 'init'; id: string; source: Source; debug?: boolean; speakerState?: SerializedSpeakerState }
  | { type: 'push'; id: string; chunk: Float32Array; startSample?: number }
  | { type: 'flush'; id: string }
  | { type: 'dispose'; id: string };

export type WorkerOutMessage =
  | { type: 'ready'; id: string; backend: DiarizerReady['backend'] }
  | { type: 'flushed'; id: string; speakerState?: SerializedSpeakerState }
  | { type: 'turn'; id: string; turn: SpeakerTurn }
  | { type: 'error'; id: string; message: string; code: DiarizerErrorCode };

export interface PendingAudio {
  chunks: { chunk: Float32Array; startSample?: number }[];
  samples: number;
}
