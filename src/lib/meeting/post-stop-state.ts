import { NO_POST_STOP_PROGRESS } from './post-stop-constants';
import type { PostStopState } from './types/post-stop';

export const postStopState: PostStopState = {
  buffers: new Map(),
  droppedSamples: new Map(),
  bufferedSamples: new Map(),
  progress: NO_POST_STOP_PROGRESS,
  running: false,
};

export function releaseBufferedAudio(): void {
  postStopState.buffers = new Map();
  postStopState.droppedSamples = new Map();
  postStopState.bufferedSamples = new Map();
}
