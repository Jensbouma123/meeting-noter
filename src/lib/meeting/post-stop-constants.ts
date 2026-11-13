import type { PostStopProgress } from './types/post-stop';

export const POST_STOP_SAMPLE_RATE = 16000;

export const MAX_BUFFERED_SAMPLES_PER_SOURCE = POST_STOP_SAMPLE_RATE * 60 * 60 * 2;

export const CHUNK_SAMPLES = POST_STOP_SAMPLE_RATE * 60;

export const NO_POST_STOP_PROGRESS: PostStopProgress = Object.freeze({
  phase: 'recording',
  chunksDone: 0,
  chunksTotal: 0,
  percent: null,
  source: null,
  droppedSeconds: 0,
  error: null,
});
