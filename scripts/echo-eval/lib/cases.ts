import type { EvalCase } from '../types/eval-case';
import type { Utterance } from '../types/utterance';
import { drawBleedParams } from './bleed-synth';
import { makeRng, uniform } from './rng';

export const ECHO_PER_SPLIT = 160;
export const CROSSTALK_PER_SPLIT = 60;

/** Seeded case list. Dev and held-out use disjoint utterance pools, so no utterance leaks between splits. */
export function buildCases(utts: Utterance[], seed = 20261119): EvalCase[] {
  const rng = makeRng(seed);
  const cases: EvalCase[] = [];
  for (const split of ['dev', 'heldout'] as const) {
    const pool = utts.filter((u) => u.split === split);
    const pick = () => pool[Math.floor(rng() * pool.length)];
    for (let i = 0; i < ECHO_PER_SPLIT; i += 1) {
      const sys = pick();
      cases.push({
        id: `echo-${split}-${i}`,
        kind: 'echo',
        split,
        systemUtt: sys.id,
        micUtt: null,
        bleed: drawBleedParams(rng),
        offsetSec: 0.3,
      });
    }
    for (let i = 0; i < CROSSTALK_PER_SPLIT; i += 1) {
      const sys = pick();
      let mic = pick();
      for (let t = 0; t < 50 && mic.speaker === sys.speaker; t += 1) mic = pick();
      if (mic.speaker === sys.speaker) continue;
      cases.push({
        id: `cross-${split}-${i}`,
        kind: 'crosstalk',
        split,
        systemUtt: sys.id,
        micUtt: mic.id,
        // Half of the crosstalk cases also carry realistic bleed of the system voice (hard negatives).
        bleed: i % 2 === 0 ? drawBleedParams(rng) : null,
        offsetSec: +uniform(rng, 0.4, Math.max(0.5, Math.min(sys.seconds, mic.seconds) * 0.6)).toFixed(2),
      });
    }
  }
  return cases;
}
