/**
 * Progress of the live transcript's Stop flush (`flushLiveAudio` in
 * `browser-asr.ts`): the audio still buffered when Stop was pressed, and how
 * much of it has been transcribed since. `null` while no flush runs.
 *
 * Inference can fall behind real time, so Stop may leave several seconds of
 * speech to transcribe; the dock shows this as "Finishing transcription".
 */
export interface LiveFlushProgress {
  /** Samples (16 kHz) transcribed since Stop. */
  done: number;
  /** Samples buffered at Stop. */
  total: number;
}

let progress: LiveFlushProgress | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

/** A flush starts with `total` samples buffered. */
export function beginLiveFlush(total: number): void {
  progress = { done: 0, total };
  emit();
}

/** `remaining` samples are still buffered. */
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
