/**
 * Streaming log-mel frontend for Nemotron-3-Diarization.
 *
 * Matches the model's `NemotronAsrStreamingFeatureExtractor`
 * (transformers `feature_extraction_nemotron_asr_streaming.py`, settings from
 * the repo's `preprocessor_config.json`):
 *  - pre-emphasis 0.97 (`y[0] = x[0]`, `y[n] = x[n] - 0.97 x[n-1]`);
 *  - `torch.stft(n_fft=512, hop=160, win_length=400, center=True,
 *    pad_mode="constant")` with a symmetric Hann window
 *    (`periodic=False`) zero-padded to 512, 56 zeros on each side;
 *  - power spectrum through a librosa Slaney mel filterbank (128 bins,
 *    0–8000 Hz, `norm="slaney"`), then `log(mel + 2^-24)`;
 *  - no normalization; `floor(samples / 160)` valid frames.
 *
 * Streaming works as one centered pass over the whole recording: frame `t`
 * is centered on sample `160 t`, so it is final once sample `160 t + 200`
 * has arrived (the window's last non-zero tap). That is exactly what the
 * processor's first-chunk-centered / later-chunks-uncentered scheme is
 * built to reproduce, minus its per-chunk pre-emphasis restart.
 */

import { fftReal } from './fft';
import { HOP_LENGTH, N_FFT, NUM_MEL_BINS, PREEMPHASIS, SAMPLE_RATE, WIN_LENGTH } from './manifest';

const LOG_GUARD = 2 ** -24;
const NUM_BINS = N_FFT / 2 + 1;
/** Offset of the 400-tap window inside the 512-sample frame. */
const WIN_OFFSET = (N_FFT - WIN_LENGTH) >> 1;
/** Samples a frame reaches past its center (last non-zero window tap + 1). */
const RIGHT_REACH = N_FFT / 2 - WIN_OFFSET;
/** Samples a frame reaches before its center. */
const LEFT_REACH = N_FFT / 2 - WIN_OFFSET;

function hzToMelSlaney(hz: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  return hz >= minLogHz ? minLogMel + Math.log(hz / minLogHz) / logStep : hz / fSp;
}

function melToHzSlaney(mel: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  return mel >= minLogMel ? minLogHz * Math.exp(logStep * (mel - minLogMel)) : fSp * mel;
}

/** `librosa.filters.mel(sr, n_fft, n_mels, fmin=0, fmax=sr/2, norm="slaney")`,
 *  row-major (numMels, n_fft/2 + 1). */
export function slaneyMelFilterbank(
  sampleRate = SAMPLE_RATE,
  nFft = N_FFT,
  numMels = NUM_MEL_BINS,
): Float32Array {
  const bins = nFft / 2 + 1;
  const minMel = hzToMelSlaney(0);
  const maxMel = hzToMelSlaney(sampleRate / 2);
  const melF = new Float64Array(numMels + 2);
  for (let i = 0; i < numMels + 2; i += 1) {
    melF[i] = melToHzSlaney(minMel + ((maxMel - minMel) * i) / (numMels + 1));
  }
  const weights = new Float32Array(numMels * bins);
  for (let m = 0; m < numMels; m += 1) {
    const lowDiff = melF[m + 1] - melF[m];
    const highDiff = melF[m + 2] - melF[m + 1];
    const enorm = 2 / (melF[m + 2] - melF[m]);
    for (let k = 0; k < bins; k += 1) {
      const freq = (k * sampleRate) / nFft;
      const lower = (freq - melF[m]) / lowDiff;
      const upper = (melF[m + 2] - freq) / highDiff;
      weights[m * bins + k] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
  }
  return weights;
}

/** `torch.hann_window(400, periodic=False)`, placed in a 512-sample frame. */
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

  /** Pre-emphasized samples, from `bufferStart` on. */
  private buffer = new Float32Array(0);
  private bufferStart = 0;
  private bufferLength = 0;
  private lastRaw = 0;
  private totalSamples = 0;
  /** Index of the next frame to compute. */
  private nextFrame = 0;

  /** Frames produced so far. */
  get framesEmitted(): number {
    return this.nextFrame;
  }

  /**
   * Add audio; returns every frame it completed, row-major
   * (frames, NUM_MEL_BINS).
   */
  push(samples: Float32Array): Float32Array {
    this.append(samples);
    let ready = 0;
    while ((this.nextFrame + ready) * HOP_LENGTH + RIGHT_REACH <= this.totalSamples) ready += 1;
    return this.compute(ready);
  }

  /**
   * End of the recording: returns the remaining valid frames, the audio past
   * the end read as zeros (the extractor's constant padding).
   */
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

  private compute(count: number): Float32Array {
    const out = new Float32Array(count * NUM_MEL_BINS);
    for (let f = 0; f < count; f += 1) {
      const center = (this.nextFrame + f) * HOP_LENGTH;
      const origin = center - N_FFT / 2;
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

  /** Keep only the samples the next frame still reads. */
  private dropConsumed(): void {
    const keepFrom = Math.max(0, this.nextFrame * HOP_LENGTH - LEFT_REACH);
    const drop = Math.min(keepFrom - this.bufferStart, this.bufferLength);
    if (drop <= 0) return;
    this.buffer.copyWithin(0, drop, this.bufferLength);
    this.bufferLength -= drop;
    this.bufferStart += drop;
  }
}
