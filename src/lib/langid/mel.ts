import {
  LANGID_N_FFT,
  LANGID_HOP_LENGTH,
  LANGID_N_MELS,
  LANGID_N_SAMPLES,
  LANGID_N_FRAMES,
  LANGID_SAMPLE_RATE,
} from './manifest';
import { buildMelFilterbank } from './mel-filterbank';
import { buildDftTables, hannWindow, reflectPad } from './stft-tables';

const N_FREQ_BINS = LANGID_N_FFT / 2 + 1;

let dftTables: { cos: Float64Array; sin: Float64Array } | null = null;
let melFilters: Float64Array | null = null;
let hann: Float64Array | null = null;

function ensureTables(): void {
  if (!dftTables) dftTables = buildDftTables(LANGID_N_FFT, N_FREQ_BINS);
  if (!melFilters) melFilters = buildMelFilterbank(LANGID_SAMPLE_RATE, LANGID_N_FFT, LANGID_N_MELS, N_FREQ_BINS);
  if (!hann) hann = hannWindow(LANGID_N_FFT);
}

export function computeLogMelSpectrogram(waveform: Float32Array): Float32Array {
  ensureTables();
  const { cos, sin } = dftTables as { cos: Float64Array; sin: Float64Array };
  const filters = melFilters as Float64Array;
  const window = hann as Float64Array;
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
