import type { EchoConfig } from '../types/echo-config';
import type { EchoFeatures } from '../types/echo-features';
import type { EchoFrames } from '../types/echo-frames';
import type { EchoWindow } from '../types/echo-window';
import { alignEcho } from './echo-align';
import { echoWindow } from './echo-window';
import { percentile } from './envelope-math';

const FRAME_MS = 10;
const EPS = 1e-12;
const SYSTEM_ACTIVE_RATIO = 4;

const mean = (x: Float64Array): number => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);

function bandGain(mic: Float64Array, sys: Float64Array, noise: number, pct: number): number {
  const loud = percentile(sys, 0.5);
  const ratios: number[] = [];
  for (let t = 0; t < sys.length; t += 1) {
    if (sys[t] >= loud && sys[t] > EPS) ratios.push(Math.max(0, mic[t] - noise) / sys[t]);
  }
  return ratios.length ? percentile(ratios, pct) : 0;
}

function systemActive(win: EchoWindow, pct: number): boolean {
  const floor = percentile(win.systemHistory, pct);
  let power = 0;
  for (const x of win.system) power += mean(x.subarray(win.lagFrames));
  return power > SYSTEM_ACTIVE_RATIO * floor + EPS;
}

export function measureEcho(
  mic: EchoFrames,
  system: EchoFrames,
  from: number,
  to: number,
  cfg: EchoConfig,
): EchoFeatures | null {
  const win = echoWindow(mic, system, from - cfg.marginFrames, to + cfg.marginFrames, cfg.maxLagFrames);
  if (!win) return null;
  const { corr, lag, delayed } = alignEcho(win, cfg.kernelsMs);
  const noise = win.micHistory.map((x) => percentile(x, cfg.noisePct));
  const gains = win.mic.map((m, b) => bandGain(m, delayed[b], noise[b], cfg.gainPct));
  const noiseSum = noise.reduce((s, n) => s + n, 0);
  let active = 0;
  let near = 0;
  for (let t = 0; t < win.frames; t += 1) {
    let heard = 0;
    let predicted = noiseSum;
    for (let b = 0; b < win.mic.length; b += 1) {
      heard += win.mic[b][t];
      predicted += gains[b] * delayed[b][t];
    }
    if (heard <= 2 * noiseSum + EPS) continue;
    active += 1;
    if (heard > cfg.nearEndRatio * predicted) near += 1;
  }
  const sysMeans = delayed.map(mean);
  const sysSum = sysMeans.reduce((s, v) => s + v, 0);
  const echoSum = sysMeans.reduce((s, v, b) => s + gains[b] * v, 0);
  return {
    corr,
    nearEnd: active ? near / active : 0,
    gainDb: 10 * Math.log10(Math.max(EPS, echoSum) / Math.max(EPS, sysSum)),
    lagMs: lag * FRAME_MS,
    systemActive: systemActive(win, cfg.noisePct),
  };
}
