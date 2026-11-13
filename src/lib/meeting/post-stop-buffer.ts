import { MAX_BUFFERED_SAMPLES_PER_SOURCE, NO_POST_STOP_PROGRESS, POST_STOP_SAMPLE_RATE } from './post-stop-constants';
import { setProgress } from './post-stop-progress';
import { postStopState, releaseBufferedAudio } from './post-stop-state';
import type { Source } from './types';

export function bufferedSeconds(): Partial<Record<Source, number>> {
  const out: Partial<Record<Source, number>> = {};
  for (const [source, chunks] of postStopState.buffers) {
    let total = postStopState.droppedSamples.get(source) ?? 0;
    for (const chunk of chunks) total += chunk.length;
    out[source] = total / POST_STOP_SAMPLE_RATE;
  }
  return out;
}

export function beginPostStopCapture(): void {
  releaseBufferedAudio();
  postStopState.running = false;
  setProgress({ ...NO_POST_STOP_PROGRESS });
}

export function clearPostStopCapture(): void {
  releaseBufferedAudio();
  setProgress({ ...NO_POST_STOP_PROGRESS });
}

export function appendPostStopAudio(source: Source, pcm: ArrayBuffer): void {
  if (postStopState.running) return;
  if (pcm.byteLength === 0 || pcm.byteLength % 2 !== 0) return;
  const samples = new Int16Array(pcm);
  const chunks = postStopState.buffers.get(source) ?? [];
  let dropped = postStopState.droppedSamples.get(source) ?? 0;
  let buffered = (postStopState.bufferedSamples.get(source) ?? 0) + samples.length;
  chunks.push(samples);
  while (buffered > MAX_BUFFERED_SAMPLES_PER_SOURCE && chunks.length > 0) {
    const excess = buffered - MAX_BUFFERED_SAMPLES_PER_SOURCE;
    const front = chunks[0];
    if (front.length <= excess) {
      chunks.shift();
      buffered -= front.length;
      dropped += front.length;
    } else {
      chunks[0] = front.subarray(excess);
      buffered -= excess;
      dropped += excess;
    }
  }
  postStopState.bufferedSamples.set(source, buffered);
  postStopState.buffers.set(source, chunks);
  postStopState.droppedSamples.set(source, dropped);
  if (dropped > 0) {
    setProgress({ ...postStopState.progress, phase: 'recording', droppedSeconds: dropped / POST_STOP_SAMPLE_RATE });
  }
}

export function hasBufferedAudio(): boolean {
  for (const chunks of postStopState.buffers.values()) {
    if (chunks.some((chunk) => chunk.length > 0)) return true;
  }
  return false;
}

export function resetPostStopTranscriptionForTests(): void {
  releaseBufferedAudio();
  postStopState.running = false;
  postStopState.progress = NO_POST_STOP_PROGRESS;
}
