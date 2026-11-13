import { MAX_PENDING_SAMPLES } from './constants';
import type { PendingAudio } from './types';

const pending = new Map<string, PendingAudio>();

export function startHoldingAudio(id: string): void {
  pending.set(id, { chunks: [], samples: 0 });
}

export function holdAudio(id: string, chunk: Float32Array, startSample?: number): void {
  const held = pending.get(id);
  if (!held) return;
  held.chunks.push({ chunk, startSample });
  held.samples += chunk.length;
  while (held.samples > MAX_PENDING_SAMPLES && held.chunks.length > 1) {
    held.samples -= held.chunks.shift()!.chunk.length;
  }
}

export function takeHeldAudio(id: string): PendingAudio | undefined {
  const held = pending.get(id);
  pending.delete(id);
  return held;
}
