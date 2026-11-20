import fs from 'node:fs';
import path from 'node:path';
import { CORPUS_DIR } from '../out-dir';
import { makeRng, uniform } from '../lib/rng';
import type { ManifestEntry as Entry } from './types/manifest-entry';
import type { MixSpec } from './types/mix-spec';

const MIN_SECONDS = 2.5;

export function planMixes(perLang = 20, seed = 20261120): MixSpec[] {
  const entries = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8')) as Entry[];
  const rng = makeRng(seed);
  const out: MixSpec[] = [];
  for (const lang of ['nl', 'en'] as const) {
    const pool = entries.filter((e) => e.language === lang && e.seconds >= MIN_SECONDS);
    const used = new Set<string>();
    for (let i = 0; i < perLang; i += 1) {
      const free = pool.filter((e) => !used.has(e.id));
      const pick = (avoid?: string): Entry => {
        const cand = free.filter((e) => e.speaker !== avoid && !used.has(e.id));
        const e = cand[Math.floor(rng() * cand.length)];
        used.add(e.id);
        return e;
      };
      const loud = pick();
      const quiet = pick(loud.speaker);
      out.push({
        id: `${lang}-${String(i).padStart(2, '0')}`,
        lang,
        loud: loud.id,
        quiet: quiet.id,
        quietDb: +uniform(rng, 1, 8).toFixed(1),
        overlap: +uniform(rng, 0.4, 1).toFixed(2),
        quietFirst: rng() < 0.5,
        bleed: i % 2 === 1,
        seed: Math.floor(rng() * 2 ** 31),
      });
      if (used.size > pool.length - 2) used.clear();
    }
  }
  return out;
}
