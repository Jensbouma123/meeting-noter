import type { BleedParams } from '../types/bleed-params';
import { convolve } from './fft-convolve';
import { highpass, lowpass } from './biquad';
import { gaussian, makeRng, uniform } from './rng';

const SR = 16_000;

// Synthetic room impulse response: direct tap + exponentially decaying noise tail.
function roomIr(rt60: number, rng: () => number): Float32Array {
  const len = Math.max(64, Math.round(rt60 * SR));
  const ir = new Float32Array(len);
  const decay = Math.log(1000) / len;
  for (let i = 0; i < len; i += 1) ir[i] = gaussian(rng) * Math.exp(-decay * i) * 0.15;
  ir[0] = 1;
  return ir;
}

const rms = (x: Float32Array): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));

export function drawBleedParams(rng: () => number): BleedParams {
  return {
    delayMs: Math.round(uniform(rng, 20, 400)),
    gainDb: +uniform(rng, -30, -6).toFixed(1),
    noiseDbfs: +uniform(rng, -62, -34).toFixed(1),
    rt60: +uniform(rng, 0.12, 0.6).toFixed(2),
    hpHz: Math.round(uniform(rng, 250, 600)),
    lpHz: Math.round(uniform(rng, 4500, 7500)),
  };
}

/** What the mic hears of the system audio: speaker EQ -> room IR -> delay -> gain, plus mic noise. */
export function bleedMicSignal(system: Float32Array, p: BleedParams, totalSamples: number, seed: number): Float32Array {
  const rng = makeRng(seed);
  const eq = lowpass(highpass(system, p.hpHz), p.lpHz);
  const wet = convolve(eq, roomIr(p.rt60, rng));
  const refRms = Math.max(1e-6, rms(system));
  const gain = 10 ** (p.gainDb / 20);
  const delay = Math.round((p.delayMs / 1000) * SR);
  const out = new Float32Array(totalSamples);
  const wetRms = Math.max(1e-6, rms(wet));
  for (let i = 0; i < wet.length && i + delay < totalSamples; i += 1) {
    out[i + delay] += (wet[i] / wetRms) * refRms * gain;
  }
  const noiseRms = 10 ** (p.noiseDbfs / 20);
  for (let i = 0; i < totalSamples; i += 1) out[i] += gaussian(rng) * noiseRms;
  return out;
}

export function mixInto(dst: Float32Array, src: Float32Array, atSample: number, gain = 1): void {
  for (let i = 0; i < src.length && atSample + i < dst.length; i += 1) dst[atSample + i] += src[i] * gain;
}
