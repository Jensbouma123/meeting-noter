/**
 * Band-limited resampler from any input rate to 16 kHz, mono Float32 in and out.
 *
 * Each output sample is a windowed-sinc low-pass (cutoff 7.2 kHz, or 0.45 of
 * an input slower than 16 kHz; 4-term Blackman-Harris window over ±2.5 ms)
 * evaluated at its exact fractional input position. Without the low-pass,
 * 8–24 kHz content (sibilants, keyboard clicks, hiss) folds into the speech
 * band at 16 kHz. The kernel is tabulated at `PHASES` sub-sample offsets and
 * linearly interpolated between them; each phase sums to 1, so DC passes
 * unchanged. The signal lags by half the kernel (2.5 ms); sample counts do not.
 *
 * `helper/Sources/Downsampler.swift` is the same algorithm with the same
 * constants: a helper frame and a browser frame are resampled alike.
 */

export const OUT_RATE = 16000;
const CUTOFF_HZ = 7200;
const HALF_WIDTH_SEC = 0.0025;
const PHASES = 256;

/** The window at `u` in [-1, 1]. */
function blackmanHarris(u) {
  const x = Math.PI * (u + 1);
  return 0.35875 - 0.48829 * Math.cos(x) + 0.14128 * Math.cos(2 * x) - 0.01168 * Math.cos(3 * x);
}

export class Resampler {
  constructor(inputRate) {
    this.ratio = inputRate / OUT_RATE; // input samples per output sample
    const fc = Math.min(CUTOFF_HZ, 0.45 * inputRate) / inputRate; // cycles per input sample
    const half = Math.max(1, Math.ceil(HALF_WIDTH_SEC * inputRate));
    this.half = half;
    this.taps = 2 * half;
    // Row p holds the weights for an output `p / PHASES` input samples past
    // the input sample that tap `half - 1` reads.
    this.table = new Float32Array((PHASES + 1) * this.taps);
    for (let p = 0; p <= PHASES; p++) {
      let sum = 0;
      const row = p * this.taps;
      for (let k = 0; k < this.taps; k++) {
        const tau = p / PHASES + half - 1 - k;
        const arg = 2 * fc * tau;
        const sinc = arg === 0 ? 1 : Math.sin(Math.PI * arg) / (Math.PI * arg);
        const u = tau / half;
        const w = Math.abs(u) >= 1 ? 0 : blackmanHarris(u);
        this.table[row + k] = 2 * fc * sinc * w;
        sum += this.table[row + k];
      }
      for (let k = 0; k < this.taps; k++) this.table[row + k] /= sum;
    }
    // The last `taps` inputs, written twice so a window is always contiguous.
    // It starts as `taps` samples of silence, so the first output is ready
    // with the first input.
    this.hist = new Float32Array(2 * this.taps);
    this.received = this.taps;
    this.whole = this.taps - half; // next output's position in input samples: whole + frac
    this.frac = 0;
  }

  /** Adds one input sample; calls `emit` with each output sample it completes. */
  push(x, emit) {
    const slot = this.received % this.taps;
    this.hist[slot] = x;
    this.hist[slot + this.taps] = x;
    this.received += 1;
    while (this.whole + this.half < this.received) {
      const first = (this.received - this.taps) % this.taps;
      const at = this.frac * PHASES;
      const p = Math.min(PHASES - 1, Math.floor(at));
      const a = at - p;
      const lo = p * this.taps;
      const hi = lo + this.taps;
      let y0 = 0;
      let y1 = 0;
      for (let k = 0; k < this.taps; k++) {
        const s = this.hist[first + k];
        y0 += this.table[lo + k] * s;
        y1 += this.table[hi + k] * s;
      }
      emit(y0 + a * (y1 - y0));
      this.frac += this.ratio;
      const step = Math.floor(this.frac);
      this.whole += step;
      this.frac -= step;
    }
  }
}
