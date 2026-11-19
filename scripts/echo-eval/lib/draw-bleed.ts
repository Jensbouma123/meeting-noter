import type { BleedParams } from '../types/bleed-params';
import { uniform } from './rng';

export function drawBleedParams(rng: () => number): BleedParams {
  const p: BleedParams = {
    delayMs: Math.round(uniform(rng, 20, 400)),
    gainDb: +uniform(rng, -30, -6).toFixed(1),
    noiseDbfs: +uniform(rng, -62, -34).toFixed(1),
    rt60: +uniform(rng, 0.12, 0.6).toFixed(2),
    hpHz: Math.round(uniform(rng, 250, 600)),
    lpHz: Math.round(uniform(rng, 4500, 7500)),
  };
  if (rng() < 0.35) p.clipDrive = +uniform(rng, 2, 8).toFixed(1);
  if (rng() < 0.35) {
    p.compressThresholdDb = +uniform(rng, -34, -18).toFixed(1);
    p.compressRatio = +uniform(rng, 3, 10).toFixed(1);
  }
  if (rng() < 0.5) p.driftPpm = Math.round(uniform(rng, -100, 100));
  if (rng() < 0.35) {
    p.aecDb = +uniform(rng, 8, 24).toFixed(1);
    p.aecDuckDb = +uniform(rng, 0, 6).toFixed(1);
  }
  return p;
}
