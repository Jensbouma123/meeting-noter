import { N_FFT, NUM_MEL_BINS, SAMPLE_RATE } from './manifest';

const SLANEY_LINEAR_HZ_PER_MEL = 200 / 3;
const SLANEY_LOG_START_HZ = 1000;
const SLANEY_LOG_START_MEL = SLANEY_LOG_START_HZ / SLANEY_LINEAR_HZ_PER_MEL;
const SLANEY_LOG_STEP = Math.log(6.4) / 27;

function hzToMelSlaney(hz: number): number {
  return hz >= SLANEY_LOG_START_HZ
    ? SLANEY_LOG_START_MEL + Math.log(hz / SLANEY_LOG_START_HZ) / SLANEY_LOG_STEP
    : hz / SLANEY_LINEAR_HZ_PER_MEL;
}

function melToHzSlaney(mel: number): number {
  return mel >= SLANEY_LOG_START_MEL
    ? SLANEY_LOG_START_HZ * Math.exp(SLANEY_LOG_STEP * (mel - SLANEY_LOG_START_MEL))
    : SLANEY_LINEAR_HZ_PER_MEL * mel;
}

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
