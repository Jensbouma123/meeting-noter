import path from 'node:path';
import { CORPUS_DIR } from '../out-dir';
import { bleedMicSignal } from '../lib/bleed-synth';
import { drawBleedParams } from '../lib/draw-bleed';
import { gaussian, makeRng } from '../lib/rng';
import { readWav16kMono } from '../lib/wav-io';
import type { MixSpec } from './types/mix-spec';
import type { RenderedMix } from './types/rendered-mix';

const SR = 16_000;
const LEAD = Math.round(0.5 * SR);
const TARGET_RMS = 0.07;

const rms = (x: Float32Array): number => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));

function scaled(x: Float32Array, target: number): Float32Array {
  const g = target / Math.max(1e-6, rms(x));
  return x.map((v) => v * g);
}

function placed(x: Float32Array, at: number, total: number): Float32Array {
  const out = new Float32Array(total);
  out.set(x, at);
  return out;
}

export function renderMix(spec: MixSpec): RenderedMix {
  const loudDry = scaled(readWav16kMono(path.join(CORPUS_DIR, `${spec.loud}.wav`)), TARGET_RMS);
  const quietDry = scaled(readWav16kMono(path.join(CORPUS_DIR, `${spec.quiet}.wav`)), TARGET_RMS * 10 ** (-spec.quietDb / 20));
  const [first, second] = spec.quietFirst ? [quietDry, loudDry] : [loudDry, quietDry];
  const ov = Math.round(spec.overlap * Math.min(first.length, second.length));
  const secondAt = LEAD + Math.max(0, first.length - ov);
  const total = Math.max(LEAD + first.length, secondAt + second.length) + LEAD;
  const firstPl = placed(first, LEAD, total);
  const secondPl = placed(second, secondAt, total);
  let [loudRef, quietRef] = spec.quietFirst ? [secondPl, firstPl] : [firstPl, secondPl];
  const mix = new Float32Array(total);
  if (spec.bleed) {
    const p = { ...drawBleedParams(makeRng(spec.seed)), gainDb: 0, noiseDbfs: -200, aecDb: undefined, aecDuckDb: undefined };
    loudRef = bleedMicSignal(loudRef, p, total, spec.seed);
    quietRef = bleedMicSignal(quietRef, p, total, spec.seed + 1);
    const noise = 10 ** (drawBleedParams(makeRng(spec.seed)).noiseDbfs / 20);
    const rng = makeRng(spec.seed + 2);
    for (let i = 0; i < total; i += 1) mix[i] = gaussian(rng) * noise;
  }
  for (let i = 0; i < total; i += 1) mix[i] += loudRef[i] + quietRef[i];
  return { spec, mix, loudRef, quietRef, loudDry, quietDry };
}
