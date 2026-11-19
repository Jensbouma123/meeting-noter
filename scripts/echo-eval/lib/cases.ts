import type { EvalCase } from '../types/eval-case';
import type { Utterance } from '../types/utterance';
import { drawBleedParams } from './draw-bleed';
import { langOf } from './factors';
import { makeRng, uniform } from './rng';

export const ECHO_PER_SPLIT = 520;
export const CROSSTALK_PER_SPLIT = 210;
const ECHO_LANGS = ['nl', 'nl', 'en'] as const;
const PAIRS = [['nl', 'nl'], ['nl', 'en'], ['en', 'nl'], ['nl', 'nl'], ['en', 'en']] as const;

export function buildCases(utts: Utterance[], seed = 20261119): EvalCase[] {
  const rng = makeRng(seed);
  const cases: EvalCase[] = [];
  for (const split of ['dev', 'heldout'] as const) {
    const pool = (lang: 'nl' | 'en') => utts.filter((u) => u.split === split && langOf(u.id) === lang);
    const pools = { nl: pool('nl'), en: pool('en') };
    const pick = (lang: 'nl' | 'en') => pools[lang][Math.floor(rng() * pools[lang].length)];
    for (let i = 0; i < ECHO_PER_SPLIT; i += 1) {
      cases.push({
        id: `v2-echo-${split}-${i}`,
        kind: 'echo',
        split,
        systemUtt: pick(ECHO_LANGS[i % ECHO_LANGS.length]).id,
        micUtt: null,
        bleed: drawBleedParams(rng),
        offsetSec: 0.3,
      });
    }
    for (let i = 0; i < CROSSTALK_PER_SPLIT; i += 1) {
      const [sl, ml] = PAIRS[i % PAIRS.length];
      const sys = pick(sl);
      let mic = pick(ml);
      for (let t = 0; t < 50 && mic.speaker === sys.speaker; t += 1) mic = pick(ml);
      if (mic.speaker === sys.speaker) continue;
      cases.push({
        id: `v2-cross-${split}-${i}`,
        kind: 'crosstalk',
        split,
        systemUtt: sys.id,
        micUtt: mic.id,
        bleed: i % 3 === 2 ? null : drawBleedParams(rng),
        offsetSec: +uniform(rng, 0.4, Math.max(0.5, Math.min(sys.seconds, mic.seconds) * 0.6)).toFixed(2),
      });
    }
  }
  return cases;
}
