import type { Source } from '../types';

export type ChunkTranscriber = (
  audio: Float32Array,
  source: Source,
  isFinal: boolean,
  startSample: number,
) => Promise<void>;

export type PostStopPhase = 'recording' | 'transcribing' | 'done' | 'error';

export interface PostStopProgress {
  phase: PostStopPhase;
  chunksDone: number;
  chunksTotal: number;
  percent: number | null;
  source: Source | null;
  droppedSeconds: number;
  error: string | null;
}

export type SampleBuffer = Int16Array[];

export interface PostStopState {
  buffers: Map<Source, SampleBuffer>;
  droppedSamples: Map<Source, number>;
  bufferedSamples: Map<Source, number>;
  progress: PostStopProgress;
  running: boolean;
}
