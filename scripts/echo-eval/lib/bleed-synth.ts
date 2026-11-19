import type { BleedParams } from '../types/bleed-params';
import { aecResidual } from './aec-residual';
import { convolve } from './fft-convolve';
import { highpass, lowpass } from './biquad';
import { resampleDrift } from './drift';
import { clip, compress } from './loudspeaker';
import { gaussian, makeRng } from './rng';

const SR = 16_000;

function roomIr(rt60: number, rng: () => number): Float32Array {
  const len = Math.max(64, Math.round(rt60 * SR));
  const ir = new Float32Array(len);
  const decay = Math.log(1000) / len;
  for (let i = 0; i < len; i += 1) ir[i] = gaussian(rng) * Math.exp(-decay * i) * 0.15;
  ir[0] = 1;
  return ir;
}

const rms = (x: Float32Array): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));

function speakerChain(system: Float32Array, p: BleedParams): Float32Array {
  let x = system;
  if (p.compressRatio) x = compress(x, p.compressThresholdDb ?? -24, p.compressRatio);
  if (p.clipDrive) x = clip(x, p.clipDrive);
  return lowpass(highpass(x, p.hpHz), p.lpHz);
}

export function bleedMicSignal(system: Float32Array, p: BleedParams, totalSamples: number, seed: number): Float32Array {
  const rng = makeRng(seed);
  const wet = convolve(speakerChain(system, p), roomIr(p.rt60, rng));
  const refRms = Math.max(1e-6, rms(system));
  const gain = 10 ** (p.gainDb / 20);
  const delay = Math.round((p.delayMs / 1000) * SR);
  let out: Float32Array = new Float32Array(totalSamples);
  const wetRms = Math.max(1e-6, rms(wet));
  for (let i = 0; i < wet.length && i + delay < totalSamples; i += 1) {
    out[i + delay] += (wet[i] / wetRms) * refRms * gain;
  }
  if (p.aecDb) out = aecResidual(out, p.aecDb, rng);
  if (p.driftPpm) out = resampleDrift(out, p.driftPpm);
  const noiseRms = 10 ** (p.noiseDbfs / 20);
  for (let i = 0; i < totalSamples; i += 1) out[i] += gaussian(rng) * noiseRms;
  return out;
}

export function mixInto(dst: Float32Array, src: Float32Array, atSample: number, gain = 1): void {
  for (let i = 0; i < src.length && atSample + i < dst.length; i += 1) dst[atSample + i] += src[i] * gain;
}
