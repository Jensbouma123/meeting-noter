import { int16ToFloat32, CAPTURE_SAMPLE_RATE } from './pcm';
import type { Source } from './types';
import type { AudioAt, HeldChunk } from './types/overlap-retranscribe';

export const HOLD_SECONDS = 40;

const held = new Map<Source, HeldChunk[]>();

export function clearHeldAudio(): void {
  held.clear();
}

export function holdFrame(source: Source, pcm: ArrayBuffer, at: number): number {
  const chunks = held.get(source) ?? [];
  const samples = int16ToFloat32(pcm);
  chunks.push({ at, samples });
  const until = at + samples.length;
  while (chunks.length > 0 && chunks[0].at + chunks[0].samples.length < until - HOLD_SECONDS * CAPTURE_SAMPLE_RATE) {
    chunks.shift();
  }
  held.set(source, chunks);
  return until;
}

export function heldAudio(source: Source): AudioAt {
  return (start, end) => {
    const chunks = held.get(source) ?? [];
    if (chunks.length === 0) return null;
    const first = chunks[0].at;
    const last = chunks[chunks.length - 1];
    const from = Math.max(first, Math.round(start * CAPTURE_SAMPLE_RATE));
    const to = Math.min(last.at + last.samples.length, Math.round(end * CAPTURE_SAMPLE_RATE));
    if (to <= from) return null;
    const audio = new Float32Array(to - from);
    for (const { at, samples } of chunks) {
      const a = Math.max(from, at);
      const b = Math.min(to, at + samples.length);
      if (b > a) audio.set(samples.subarray(a - at, b - at), a - from);
    }
    return { audio, start: from / CAPTURE_SAMPLE_RATE };
  };
}
