import type { SortformerRunner, Source, SpeakerTurn, StreamingMode } from '@/lib/diarization/browser/types';

export interface DiarizeClipOptions {
  model: SortformerRunner;
  source?: Source;
  mode?: StreamingMode;
  frameSamples?: number;
}

export interface DiarizeClipResult {
  turns: SpeakerTurn[];
  finalTurns: SpeakerTurn[];
  slots: string[];
  rtf: number;
}

export interface DiarizerCoreQueue {
  running: Promise<void> | null;
}
