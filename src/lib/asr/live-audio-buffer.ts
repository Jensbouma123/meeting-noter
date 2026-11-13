import type { AudioChunk } from './types';

export class LiveAudioBuffer {
  private chunks: AudioChunk[] = [];
  startSample = 0;
  length = 0;
  sinceTake = 0;
  trailingQuiet = 0;
  hasVoice = false;

  append(samples: Float32Array, voiced: boolean, quiet: boolean, at?: number): void {
    if (this.length === 0 && at !== undefined) this.startSample = at;
    this.chunks.push({ samples, voiced });
    this.length += samples.length;
    this.sinceTake += samples.length;
    this.trailingQuiet = quiet ? this.trailingQuiet + samples.length : 0;
    if (voiced) this.hasVoice = true;
  }

  readWindow(size: number): Float32Array {
    const audio = new Float32Array(size);
    let filled = 0;
    for (const chunk of this.chunks) {
      if (filled >= size) break;
      const part = chunk.samples.subarray(0, size - filled);
      audio.set(part, filled);
      filled += part.length;
    }
    return audio;
  }

  markTaken(): void {
    this.sinceTake = 0;
  }

  dropBefore(at: number): void {
    let drop = Math.min(this.length, Math.max(0, Math.round(at) - this.startSample));
    if (drop === 0) return;
    this.startSample += drop;
    this.length -= drop;
    this.sinceTake = Math.min(this.sinceTake, this.length);
    this.trailingQuiet = Math.min(this.trailingQuiet, this.length);
    while (drop > 0 && this.chunks.length > 0) {
      const head = this.chunks[0];
      if (head.samples.length <= drop) {
        drop -= head.samples.length;
        this.chunks.shift();
      } else {
        this.chunks[0] = { samples: head.samples.subarray(drop), voiced: head.voiced };
        drop = 0;
      }
    }
    this.hasVoice = this.chunks.some((c) => c.voiced);
  }

  reset(): void {
    this.chunks = [];
    this.startSample = 0;
    this.length = 0;
    this.sinceTake = 0;
    this.trailingQuiet = 0;
    this.hasVoice = false;
  }
}
