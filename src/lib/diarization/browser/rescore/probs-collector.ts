export class ProbsCollector {
  private chunks: Uint8Array[] = [];
  private size = 0;

  constructor(private readonly numChannels: number) {}

  push(probs: ArrayLike<number>): Uint8Array {
    const block = new Uint8Array(probs.length);
    for (let i = 0; i < probs.length; i += 1) {
      const p = probs[i];
      block[i] = Math.round((p > 1 ? 1 : p > 0 ? p : 0) * 255);
    }
    this.chunks.push(block);
    this.size += block.length;
    return block;
  }

  get frames(): number {
    return Math.floor(this.size / this.numChannels);
  }

  toFloat32(): Float32Array {
    const out = new Float32Array(this.size);
    let at = 0;
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.length; i += 1) out[at + i] = chunk[i] / 255;
      at += chunk.length;
    }
    return out;
  }

  clear(): void {
    this.chunks = [];
    this.size = 0;
  }
}
