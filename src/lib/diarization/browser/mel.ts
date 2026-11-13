import { fftReal } from './fft';
import { HOP_LENGTH, N_FFT, NUM_MEL_BINS, PREEMPHASIS, WIN_LENGTH } from './manifest';
import { slaneyMelFilterbank } from './mel-filterbank';

const LOG_GUARD = 2 ** -24;
const NUM_BINS = N_FFT / 2 + 1;
const WIN_OFFSET = (N_FFT - WIN_LENGTH) >> 1;
const RIGHT_REACH = N_FFT / 2 - WIN_OFFSET;
const LEFT_REACH = N_FFT / 2 - WIN_OFFSET;

function paddedHannWindow(): Float64Array {
  const w = new Float64Array(N_FFT);
  for (let n = 0; n < WIN_LENGTH; n += 1) {
    w[WIN_OFFSET + n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (WIN_LENGTH - 1));
  }
  return w;
}

export class MelFrontend {
  private readonly filters = slaneyMelFilterbank();
  private readonly window = paddedHannWindow();
  private readonly frame = new Float64Array(N_FFT);
  private readonly power = new Float64Array(NUM_BINS);

  private buffer = new Float32Array(0);
  private bufferStart = 0;
  private bufferLength = 0;
  private lastRaw = 0;
  private totalSamples = 0;
  private nextFrame = 0;

  get framesEmitted(): number {
    return this.nextFrame;
  }

  push(samples: Float32Array): Float32Array {
    this.append(samples);
    let ready = 0;
    while ((this.nextFrame + ready) * HOP_LENGTH + RIGHT_REACH <= this.totalSamples) ready += 1;
    return this.compute(ready);
  }

  finish(): Float32Array {
    const valid = Math.floor(this.totalSamples / HOP_LENGTH);
    return this.compute(Math.max(0, valid - this.nextFrame));
  }

  private append(samples: Float32Array): void {
    const needed = this.bufferLength + samples.length;
    if (needed > this.buffer.length) {
      const next = new Float32Array(Math.max(needed, this.buffer.length * 2, 4096));
      next.set(this.buffer.subarray(0, this.bufferLength));
      this.buffer = next;
    }
    let prev = this.lastRaw;
    for (let i = 0; i < samples.length; i += 1) {
      const x = samples[i];
      this.buffer[this.bufferLength + i] = this.totalSamples + i === 0 ? x : x - PREEMPHASIS * prev;
      prev = x;
    }
    if (samples.length > 0) this.lastRaw = samples[samples.length - 1];
    this.bufferLength += samples.length;
    this.totalSamples += samples.length;
  }

  private fillWindowedFrame(origin: number): void {
    for (let i = 0; i < N_FFT; i += 1) {
      const w = this.window[i];
      if (w === 0) {
        this.frame[i] = 0;
        continue;
      }
      const s = origin + i - this.bufferStart;
      const inRange = origin + i >= 0 && origin + i < this.totalSamples;
      this.frame[i] = inRange ? this.buffer[s] * w : 0;
    }
  }

  private compute(count: number): Float32Array {
    const out = new Float32Array(count * NUM_MEL_BINS);
    for (let f = 0; f < count; f += 1) {
      const center = (this.nextFrame + f) * HOP_LENGTH;
      this.fillWindowedFrame(center - N_FFT / 2);
      const { re, im } = fftReal(this.frame);
      for (let k = 0; k < NUM_BINS; k += 1) this.power[k] = re[k] * re[k] + im[k] * im[k];
      for (let m = 0; m < NUM_MEL_BINS; m += 1) {
        let sum = 0;
        const row = m * NUM_BINS;
        for (let k = 0; k < NUM_BINS; k += 1) sum += this.filters[row + k] * this.power[k];
        out[f * NUM_MEL_BINS + m] = Math.log(sum + LOG_GUARD);
      }
    }
    this.nextFrame += count;
    this.dropConsumed();
    return out;
  }

  private dropConsumed(): void {
    const keepFrom = Math.max(0, this.nextFrame * HOP_LENGTH - LEFT_REACH);
    const drop = Math.min(keepFrom - this.bufferStart, this.bufferLength);
    if (drop <= 0) return;
    this.buffer.copyWithin(0, drop, this.bufferLength);
    this.bufferLength -= drop;
    this.bufferStart += drop;
  }
}
