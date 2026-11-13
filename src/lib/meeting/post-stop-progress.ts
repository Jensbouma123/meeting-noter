import { NO_POST_STOP_PROGRESS } from './post-stop-constants';
import { postStopState } from './post-stop-state';
import type { PostStopProgress } from './types/post-stop';

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners) fn();
}

function sameProgress(a: PostStopProgress, b: PostStopProgress): boolean {
  return (
    a.phase === b.phase &&
    a.chunksDone === b.chunksDone &&
    a.chunksTotal === b.chunksTotal &&
    a.percent === b.percent &&
    a.source === b.source &&
    a.droppedSeconds === b.droppedSeconds &&
    a.error === b.error
  );
}

export function setProgress(next: PostStopProgress): void {
  if (sameProgress(postStopState.progress, next)) return;
  postStopState.progress = next;
  notifyListeners();
}

export function subscribePostStopTranscription(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getPostStopProgress(): PostStopProgress {
  return postStopState.progress;
}

export function getServerPostStopProgress(): PostStopProgress {
  return NO_POST_STOP_PROGRESS;
}

export function isPostStopTranscriptionRunning(): boolean {
  return postStopState.running;
}
