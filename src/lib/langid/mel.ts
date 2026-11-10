/** Whisper-compatible log-mel spectrogram, computed in pure JS.
 *
 * Reproduces `whisper.audio.log_mel_spectrogram` (the same routine every
 * Whisper ONNX export, including `Xenova/whisper-tiny`, was trained against):
 *
 *   1. zero-pad/trim the waveform to exactly 30s (`LANGID_N_SAMPLES`)
 *   2. STFT with a Hann window, `n_fft=400`, `hop_length=160`, reflect-padded
 *      framing (`torch.stft(..., center=True)`), keeping all but the last frame
 *   3. project power spectrum through an 80-band Slaney-normalized mel
 *      filterbank (`librosa.filters.mel(sr=16000, n_fft=400, n_mels=80)`)
 *   4. log10, clamp to `[max - 8, max]`, rescale to `(x + 4) / 4`
 *
 * No FFT library dependency: `n_fft=400` isn't a power of two (it factors as
 * 2^4 * 5^2), so a textbook radix-2 FFT doesn't apply directly and a mixed-
 * radix implementation is more failure-prone than it's worth here. Frames are
 * few enough (3000 per 30s window, run only every 5-10s per source, in a
 * worker) that a direct DFT via a precomputed cos/sin table is fast enough
 * and trivially correct.
 */
import {
  LANGID_N_FFT,
  LANGID_HOP_LENGTH,
  LANGID_N_MELS,
  LANGID_N_SAMPLES,
  LANGID_N_FRAMES,
  LANGID_SAMPLE_RATE,
} from './manifest';

const N_FREQ_BINS = LANGID_N_FFT / 2 + 1; // 201

function hannWindow(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  }
  return w;
}

/** Precomputed per-bin cos/sin tables for a direct DFT of length `n_fft`. */
function buildDftTables(nFft: number, nFreqBins: number): { cos: Float64Array; sin: Float64Array } {
  const cos = new Float64Array(nFreqBins * nFft);
  const sin = new Float64Array(nFreqBins * nFft);
  for (let k = 0; k < nFreqBins; k++) {
    for (let n = 0; n < nFft; n++) {
      const angle = (2 * Math.PI * k * n) / nFft;
      cos[k * nFft + n] = Math.cos(angle);
      sin[k * nFft + n] = Math.sin(angle);
    }
  }
  return { cos, sin };
}

/** Slaney mel scale (librosa default, `htk=False`). */
function hzToMel(hz: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp; // 15.0
  const logstep = Math.log(6.4) / 27;
  if (hz < minLogHz) return hz / fSp;
  return minLogMel + Math.log(hz / minLogHz) / logstep;
}

function melToHz(mel: number): number {
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logstep = Math.log(6.4) / 27;
  if (mel < minLogMel) return fSp * mel;
  return minLogHz * Math.exp(logstep * (mel - minLogMel));
}

/** `librosa.filters.mel(sr, n_fft, n_mels)` — Slaney-normalized triangular
 *  filterbank, flattened as `[nMels][nFreqBins]` row-major. */
function buildMelFilterbank(sampleRate: number, nFft: number, nMels: number, nFreqBins: number): Float64Array {
  const fMin = 0;
  const fMax = sampleRate / 2;
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);

  const melPoints = new Float64Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = melMin + ((melMax - melMin) * i) / (nMels + 1);
  }
  const hzPoints = Float64Array.from(melPoints, melToHz);
  const fftFreqs = new Float64Array(nFreqBins);
  for (let i = 0; i < nFreqBins; i++) fftFreqs[i] = (i * sampleRate) / nFft;

  const filters = new Float64Array(nMels * nFreqBins);
  for (let m = 0; m < nMels; m++) {
    const left = hzPoints[m];
    const center = hzPoints[m + 1];
    const right = hzPoints[m + 2];
    // Slaney-style area normalization so each filter integrates to ~constant energy.
    const enorm = 2 / (right - left);
    for (let k = 0; k < nFreqBins; k++) {
      const f = fftFreqs[k];
      const upSlope = (f - left) / (center - left);
      const downSlope = (right - f) / (right - center);
      const weight = Math.max(0, Math.min(upSlope, downSlope));
      filters[m * nFreqBins + k] = weight * enorm;
    }
  }
  return filters;
}

/** Reflect-pad (numpy `mode='reflect'` semantics: edge sample not repeated). */
function reflectPad(input: Float32Array, pad: number): Float64Array {
  const n = input.length;
  const out = new Float64Array(n + 2 * pad);
  for (let i = 0; i < pad; i++) {
    out[i] = input[Math.min(pad - i, n - 1)];
    out[pad + n + i] = input[Math.max(n - 2 - i, 0)];
  }
  for (let i = 0; i < n; i++) out[pad + i] = input[i];
  return out;
}

let dftTables: { cos: Float64Array; sin: Float64Array } | null = null;
let melFilters: Float64Array | null = null;
let hann: Float64Array | null = null;

function ensureTables(): void {
  if (!dftTables) dftTables = buildDftTables(LANGID_N_FFT, N_FREQ_BINS);
  if (!melFilters) melFilters = buildMelFilterbank(LANGID_SAMPLE_RATE, LANGID_N_FFT, LANGID_N_MELS, N_FREQ_BINS);
  if (!hann) hann = hannWindow(LANGID_N_FFT);
}

/**
 * Compute the Whisper log-mel spectrogram for a mono 16kHz waveform.
 * Returns a flat `Float32Array` shaped `[LANGID_N_MELS, LANGID_N_FRAMES]`
 * (row-major, matching the encoder's expected `input_features` layout).
 */
export function computeLogMelSpectrogram(waveform: Float32Array): Float32Array {
  ensureTables();
  const { cos, sin } = dftTables as { cos: Float64Array; sin: Float64Array };
  const filters = melFilters as Float64Array;
  const window = hann as Float64Array;

  // Zero-pad/trim to exactly 30s, then reflect-pad by n_fft/2 for centered framing.
  const fixed = new Float32Array(LANGID_N_SAMPLES);
  fixed.set(waveform.subarray(0, Math.min(waveform.length, LANGID_N_SAMPLES)));
  const padded = reflectPad(fixed, LANGID_N_FFT / 2);

  const power = new Float64Array(N_FREQ_BINS);
  const framed = new Float64Array(LANGID_N_FFT);
  const melEnergies = new Float32Array(LANGID_N_MELS * LANGID_N_FRAMES);

  for (let t = 0; t < LANGID_N_FRAMES; t++) {
    const start = t * LANGID_HOP_LENGTH;
    for (let n = 0; n < LANGID_N_FFT; n++) framed[n] = padded[start + n] * window[n];

    for (let k = 0; k < N_FREQ_BINS; k++) {
      let re = 0;
      let im = 0;
      const base = k * LANGID_N_FFT;
      for (let n = 0; n < LANGID_N_FFT; n++) {
        const x = framed[n];
        re += x * cos[base + n];
        im -= x * sin[base + n];
      }
      power[k] = re * re + im * im;
    }

    for (let m = 0; m < LANGID_N_MELS; m++) {
      let sum = 0;
      const fbase = m * N_FREQ_BINS;
      for (let k = 0; k < N_FREQ_BINS; k++) sum += filters[fbase + k] * power[k];
      melEnergies[m * LANGID_N_FRAMES + t] = sum;
    }
  }

  let maxLog = -Infinity;
  const logSpec = new Float32Array(melEnergies.length);
  for (let i = 0; i < melEnergies.length; i++) {
    const v = Math.log10(Math.max(melEnergies[i], 1e-10));
    logSpec[i] = v;
    if (v > maxLog) maxLog = v;
  }
  const floor = maxLog - 8;
  for (let i = 0; i < logSpec.length; i++) {
    const clamped = Math.max(logSpec[i], floor);
    logSpec[i] = (clamped + 4) / 4;
  }
  return logSpec;
}
