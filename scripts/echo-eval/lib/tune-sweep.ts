import type { EchoConfig } from "@/lib/meeting/types/echo-config";
import type { MeasuredCase } from "../types/measured-case";
import type { TuneScore } from "../types/tune-score";
import type { TuneTrial } from "../types/tune-trial";
import { scoreAll } from "./tune-score";

const range = (from: number, to: number, step: number): number[] =>
  Array.from(
    { length: Math.round((to - from) / step) + 1 },
    (_, i) => +(from + i * step).toFixed(3),
  );

const GRID = {
  minCorr: range(0.3, 0.9, 0.05),
  maxNearEnd: range(0.05, 0.6, 0.05),
  maxGainDb: [...range(-30, 0, 3), 6],
};

const cost = (s: TuneScore, maxFalseDrop: number): number =>
  s.falseDrop > maxFalseDrop ? Infinity : s.miss + 0.5 * s.falseDrop;

export function sweepThresholds(
  cases: MeasuredCase[],
  base: EchoConfig,
  maxFalseDrop: number,
  keep = 10,
): TuneTrial[] {
  const trials: TuneTrial[] = [];
  for (const minCorr of GRID.minCorr)
    for (const maxNearEnd of GRID.maxNearEnd)
      for (const maxGainDb of GRID.maxGainDb) {
        const cfg = { ...base, minCorr, maxNearEnd, maxGainDb };
        const score = scoreAll(cases, cfg);
        const c = cost(score, maxFalseDrop);
        if (c === Infinity) continue;
        trials.push({ cfg, score, cost: c });
        if (trials.length > keep * 50) prune(trials, keep);
      }
  return prune(trials, keep);
}

function prune(trials: TuneTrial[], keep: number): TuneTrial[] {
  trials.sort((a, b) => a.cost - b.cost || b.cfg.minCorr - a.cfg.minCorr);
  trials.length = Math.min(trials.length, keep);
  return trials;
}
