import { NUM_MEL_BINS } from './manifest';

export class MelFrameBuffer {
  private frames = new Float32Array(0);
  private start = 0;
  private end = 0;

  get endFrame(): number {
    return this.end;
  }

  append(newFrames: Float32Array): void {
    if (newFrames.length === 0) return;
    const used = (this.end - this.start) * NUM_MEL_BINS;
    if (used + newFrames.length > this.frames.length) {
      const next = new Float32Array(Math.max(used + newFrames.length, this.frames.length * 2));
      next.set(this.frames.subarray(0, used));
      this.frames = next;
    }
    this.frames.set(newFrames, used);
    this.end += newFrames.length / NUM_MEL_BINS;
  }

  slice(fromFrame: number, count: number): Float32Array {
    return this.frames.slice(
      (fromFrame - this.start) * NUM_MEL_BINS,
      (fromFrame - this.start + count) * NUM_MEL_BINS,
    );
  }

  dropBefore(frame: number): void {
    const drop = frame - this.start;
    if (drop <= 0) return;
    const used = (this.end - this.start) * NUM_MEL_BINS;
    this.frames.copyWithin(0, drop * NUM_MEL_BINS, used);
    this.start = frame;
  }
}
