import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR } from '../out-dir';
import type { MixResult, SpeakerScore } from './types/mix-result';

const rows = fs
  .readFileSync(path.join(OUT_DIR, 'sep-phase0.results.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as MixResult);

const imp = (s: SpeakerScore): number => s.siSdrSep - s.siSdrMix;
const pct = (n: number): string => `${(100 * n).toFixed(0)}%`;
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function miss(rs: MixResult[], who: 'loud' | 'quiet', key: 'hitMix' | 'hitSep'): number {
  const ref = rs.reduce((n, r) => n + r[who].refWords, 0);
  return 1 - rs.reduce((n, r) => n + r[who][key], 0) / Math.max(1, ref);
}

function wer(rs: MixResult[], who: 'loud' | 'quiet'): number {
  return rs.reduce((n, r) => n + r[who].editSep, 0) / Math.max(1, rs.reduce((n, r) => n + r[who].refWords, 0));
}

const lines = [
  '| mix | ovl | quiet dB | bleed | s | sep ms | SI-SDRi loud | SI-SDRi quiet | loud words mix→sep | quiet words mix→sep |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.spec.id} | ${r.spec.overlap} | -${r.spec.quietDb} | ${r.spec.bleed ? 'y' : 'n'} | ${r.seconds.toFixed(1)} | ${r.sepMs.toFixed(0)} | ${imp(r.loud).toFixed(1)} | ${imp(r.quiet).toFixed(1)} | ${r.loud.hitMix}→${r.loud.hitSep}/${r.loud.refWords} | ${r.quiet.hitMix}→${r.quiet.hitSep}/${r.quiet.refWords} |`,
  ),
  '',
  '| group | n | mean SI-SDRi loud | mean SI-SDRi quiet | quiet miss mix | quiet miss sep | quiet WER sep | loud miss mix | loud miss sep | loud WER sep |',
  '|---|---|---|---|---|---|---|---|---|---|',
];
for (const lang of ['nl', 'en', 'all'])
  for (const bleed of [false, true, undefined]) {
    const rs = rows.filter((r) => (lang === 'all' || r.spec.lang === lang) && (bleed === undefined || r.spec.bleed === bleed));
    if (!rs.length) continue;
    const name = `${lang} ${bleed === undefined ? 'all' : bleed ? 'bleed' : 'clean'}`;
    lines.push(
      `| ${name} | ${rs.length} | ${mean(rs.map((r) => imp(r.loud))).toFixed(1)} | ${mean(rs.map((r) => imp(r.quiet))).toFixed(1)} | ${pct(miss(rs, 'quiet', 'hitMix'))} | ${pct(miss(rs, 'quiet', 'hitSep'))} | ${pct(wer(rs, 'quiet'))} | ${pct(miss(rs, 'loud', 'hitMix'))} | ${pct(miss(rs, 'loud', 'hitSep'))} | ${pct(wer(rs, 'loud'))} |`,
    );
  }
console.log(lines.join('\n'));
