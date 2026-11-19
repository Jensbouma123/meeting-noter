import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { DEFAULT_ECHO_CONFIG } from '@/lib/meeting/echo/echo-defaults';
import { AUDIO_DIR, OUT_DIR, RESULTS_FILE } from './out-dir';
import { buildCases } from './lib/cases';
import { measureCase, measureFeatures } from './lib/measure-case';
import { renderCase } from './lib/render-case';
import { scoreAll } from './lib/tune-score';
import { sweepThresholds } from './lib/tune-sweep';
import { loadUtterances } from './lib/utterances';
import type { CaseResult } from './types/case-result';
import type { TuneTrial } from './types/tune-trial';

const RESULTS = process.env.ECHO_TUNE_RESULTS ?? RESULTS_FILE;
const FEATURE_GRID = [2, 4, 8].flatMap((nearEndRatio) => [0.2, 0.3, 0.5].map((gainPct) => ({ nearEndRatio, gainPct })));

describe.skipIf(process.env.ECHO_TUNE !== '1')('echo verdict tuner (dev split only)', () => {
  it('sweeps thresholds against the dev int8 results', () => {
    const utts = loadUtterances(AUDIO_DIR);
    const byId = new Map(utts.map((u) => [u.id, u]));
    const cases = new Map(buildCases(utts).map((c) => [c.id, c]));
    const results = fs.readFileSync(RESULTS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as CaseResult);
    const dev = results.filter((r) => r.split === 'dev' && cases.has(r.id));
    const measured = dev.map((r) => measureCase(r, renderCase(cases.get(r.id)!, byId), DEFAULT_ECHO_CONFIG));
    const baseline = scoreAll(measured, null);
    fs.writeFileSync(
      path.join(OUT_DIR, 'features.jsonl'),
      measured.map((m) => JSON.stringify({ id: m.result.id, segs: m.result.micAsr, features: m.features })).join('\n') + '\n',
    );
    const best: (TuneTrial & { feature: object })[] = [];
    for (const feature of FEATURE_GRID) {
      const cfg = { ...DEFAULT_ECHO_CONFIG, ...feature };
      const remeasured = measured.map((m) => measureFeatures(m, cfg));
      best.push(...sweepThresholds(remeasured, cfg, baseline.falseDrop, 3).map((t) => ({ ...t, feature })));
    }
    best.sort((a, b) => a.cost - b.cost);
    const report = { cases: dev.length, baseline, defaults: scoreAll(measured, DEFAULT_ECHO_CONFIG), best: best.slice(0, 12) };
    fs.writeFileSync(path.join(OUT_DIR, 'tune.json'), JSON.stringify(report, null, 2));
  });
});
