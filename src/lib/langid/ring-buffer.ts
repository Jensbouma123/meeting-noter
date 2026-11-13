export class SampleRing {
  private readonly data: Float32Array;
  private head = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity);
  }

  get length(): number {
    return this.filled;
  }

  push(samples: Float32Array): void {
    const src = samples.length > this.capacity ? samples.subarray(samples.length - this.capacity) : samples;
    const firstPart = Math.min(src.length, this.capacity - this.head);
    this.data.set(src.subarray(0, firstPart), this.head);
    if (firstPart < src.length) this.data.set(src.subarray(firstPart), 0);
    this.head = (this.head + src.length) % this.capacity;
    this.filled = Math.min(this.capacity, this.filled + src.length);
  }

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
