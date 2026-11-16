// Kaldi-compatible 80-bin log fbank as WeSpeaker uses it at inference: dither 0,
// povey window, snip_edges, int16-scale input. Port of exchange/diar16 fbank.py.
import { fftReal } from '../fft';

const SR = 16_000;
const FRAME = 400;
const SHIFT = 160;
const NFFT = 512;
export const FBANK_BINS = 80;
const PRE = 0.97;
const EPS = 1.1920928955078125e-7;

const mel = (f: number): number => 1127 * Math.log(1 + f / 700);

function melBanks(): Float32Array[] {
  const lo = mel(20);
  const delta = (mel(SR / 2) - lo) / (FBANK_BINS + 1);
  const banks: Float32Array[] = [];
  for (let b = 0; b < FBANK_BINS; b += 1) {
    const left = lo + b * delta;
    const centre = left + delta;
    const right = centre + delta;
    const w = new Float32Array(NFFT / 2 + 1);
    for (let i = 0; i < NFFT / 2; i += 1) {
      const m = mel((i * SR) / NFFT);
      if (m > left && m < right) w[i] = m <= centre ? (m - left) / (centre - left) : (right - m) / (right - centre);
    }
    banks.push(w);
  }
  return banks;
}

function poveyWindow(): Float32Array {
  const w = new Float32Array(FRAME);
  for (let n = 0; n < FRAME; n += 1) w[n] = (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (FRAME - 1))) ** 0.85;
  return w;
}

let banks: Float32Array[] | null = null;
let window: Float32Array | null = null;

/** int16-scale samples -> [frames * 80] log-mel energies, mean-normalised per bin (CMN). */
export function fbankCmn(samples: ArrayLike<number>): { feats: Float32Array; frames: number } {
  banks ??= melBanks();
  window ??= poveyWindow();
  const frames = samples.length >= FRAME ? 1 + Math.floor((samples.length - FRAME) / SHIFT) : 0;
  const feats = new Float32Array(frames * FBANK_BINS);
  const fr = new Float64Array(NFFT);
  for (let t = 0; t < frames; t += 1) {
    const at = t * SHIFT;
    let mean = 0;
    for (let n = 0; n < FRAME; n += 1) mean += samples[at + n];
    mean /= FRAME;
    fr.fill(0);
    for (let n = FRAME - 1; n >= 0; n -= 1) {
      const x = samples[at + n] - mean;
      const prev = n > 0 ? samples[at + n - 1] - mean : x;
      fr[n] = (x - PRE * prev) * window[n];
    }
    const { re, im } = fftReal(fr);
    for (let b = 0; b < FBANK_BINS; b += 1) {
      const w = banks[b];
      let e = 0;
      for (let i = 0; i <= NFFT / 2; i += 1) if (w[i] !== 0) e += (re[i] * re[i] + im[i] * im[i]) * w[i];
      feats[t * FBANK_BINS + b] = Math.log(Math.max(e, EPS));
    }
  }
  subtractMean(feats, frames);
  return { feats, frames };
}

function subtractMean(feats: Float32Array, frames: number): void {
  if (frames === 0) return;
  for (let b = 0; b < FBANK_BINS; b += 1) {
    let m = 0;
    for (let t = 0; t < frames; t += 1) m += feats[t * FBANK_BINS + b];
    m /= frames;
    for (let t = 0; t < frames; t += 1) feats[t * FBANK_BINS + b] -= m;
  }
}
