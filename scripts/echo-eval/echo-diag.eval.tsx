import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { DEFAULT_ECHO_CONFIG } from '@/lib/meeting/echo/echo-defaults';
import type { EchoConfig } from '@/lib/meeting/types/echo-config';
import type { EchoFeatures } from '@/lib/meeting/types/echo-features';
import { AUDIO_DIR, OUT_DIR, RESULTS_FILE } from './out-dir';
import { buildCases } from './lib/cases';
import { wordCount } from './lib/classify';
import { variantsOf } from './lib/factor-variants';
import { summarize } from './lib/feature-summary';
import { measureCase, measureFeatures } from './lib/measure-case';
import { renderCase } from './lib/render-case';
import { loadUtterances } from './lib/utterances';
import type { CaseResult } from './types/case-result';

const RESULTS = process.env.ECHO_TUNE_RESULTS ?? RESULTS_FILE;
const OVERRIDES = JSON.parse(process.env.ECHO_DIAG_CFGS ?? '[{}]') as Partial<EchoConfig>[];
const CONFIGS = OVERRIDES.map((o) => ({ ...DEFAULT_ECHO_CONFIG, ...o }));

const heard = (r: CaseResult): CaseResult => ({ ...r, micAsr: r.micAsr.filter((s) => wordCount(s.text) >= 1) });

describe.skipIf(process.env.ECHO_DIAG !== '1')('echo feature diagnostics per factor (dev split only)', () => {
  it('measures single-factor re-renders of the dev echo cases', () => {
    const utts = loadUtterances(AUDIO_DIR);
    const byId = new Map(utts.map((u) => [u.id, u]));
    const cases = new Map(buildCases(utts).map((c) => [c.id, c]));
    const results = fs.readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as CaseResult);
    const dev = results.filter((r) => r.split === 'dev' && cases.has(r.id) && r.bleed).map(heard);
    const groups = new Map<string, (EchoFeatures | null)[]>();
    const add = (key: string, fs: (EchoFeatures | null)[]) => groups.set(key, [...(groups.get(key) ?? []), ...fs]);
    for (const r of dev) {
      if (!r.micAsr.length) continue;
      const c = cases.get(r.id)!;
      const variants = r.kind === 'echo' ? variantsOf(r.bleed!) : [{ name: 'as drawn', bleed: r.bleed! }];
      for (const v of variants) {
        const m = measureCase(r, renderCase({ ...c, bleed: v.bleed }, byId), CONFIGS[0]);
        CONFIGS.forEach((cfg, i) => add(`${i} ${r.kind}: ${v.name}`, measureFeatures(m, cfg).features));
      }
    }
    const out = Object.fromEntries([...groups].sort().map(([k, fs]) => [k, summarize(fs, CONFIGS[+k.split(' ')[0]])]));
    fs.writeFileSync(path.join(OUT_DIR, 'diag.json'), JSON.stringify(out, null, 1));
  });
});
