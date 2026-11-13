import type { LiveFlushProgress } from './types/live-flush-progress';

let progress: LiveFlushProgress | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function beginLiveFlush(total: number): void {
  progress = { done: 0, total };
  emit();
}

export function updateLiveFlush(remaining: number): void {
  if (!progress) return;
  const done = Math.min(progress.total, Math.max(progress.done, progress.total - remaining));
  if (done === progress.done) return;
  progress = { ...progress, done };
  emit();
}

export function endLiveFlush(): void {
  if (!progress) return;
  progress = null;
  emit();
}

export function getLiveFlushProgress(): LiveFlushProgress | null {
  return progress;
}

export function getServerLiveFlushProgress(): LiveFlushProgress | null {
  return null;
}

export function subscribeLiveFlush(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
