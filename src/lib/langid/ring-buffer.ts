/** Fixed-capacity rolling window of the most recent samples.
 *
 *  The worker used to keep its 30 s window as a plain `Float32Array` and
 *  rebuild it on every push: a fresh ~1.9 MB allocation plus a full copy,
 *  about ten times a second per source. This allocates once and writes each
 *  frame in place; the window is only laid out contiguously when a detection
 *  pass actually needs it (`toArray`), which is once every ~20 s. */
export class SampleRing {
  private readonly data: Float32Array;
  /** Index the next sample is written to. */
  private head = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity);
  }

  get length(): number {
    return this.filled;
  }

  push(samples: Float32Array): void {
    // A frame longer than the window: only its tail can survive anyway.
    const src = samples.length > this.capacity ? samples.subarray(samples.length - this.capacity) : samples;
    const firstPart = Math.min(src.length, this.capacity - this.head);
    this.data.set(src.subarray(0, firstPart), this.head);
    if (firstPart < src.length) this.data.set(src.subarray(firstPart), 0);
    this.head = (this.head + src.length) % this.capacity;
    this.filled = Math.min(this.capacity, this.filled + src.length);
  }

  /** The window, oldest sample first, as a new contiguous array. */
  toArray(): Float32Array {
    const out = new Float32Array(this.filled);
    if (this.filled < this.capacity) {
      out.set(this.data.subarray(0, this.filled));
    } else {
      out.set(this.data.subarray(this.head));
      out.set(this.data.subarray(0, this.head), this.capacity - this.head);
    }
    return out;
  }
}
