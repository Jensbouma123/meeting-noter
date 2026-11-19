import type { CaseResult } from '../types/case-result';
import { pct, wilson } from './stats';

type Bin = [string, (r: CaseResult) => boolean];
const b = (get: (r: CaseResult) => number, lo: number, hi: number): ((r: CaseResult) => boolean) => (r) => {
  const v = get(r);
  return v >= lo && v < hi;
};
const D = (r: CaseResult) => r.bleed?.delayMs ?? NaN;
const G = (r: CaseResult) => r.bleed?.gainDb ?? NaN;
const N = (r: CaseResult) => r.bleed?.noiseDbfs ?? NaN;

export const BINS: Record<string, Bin[]> = {
  'delay (ms)': [['20-100', b(D, 20, 100)], ['100-250', b(D, 100, 250)], ['250-400', b(D, 250, 401)]],
  'gain (dB)': [['-30..-20', b(G, -31, -20)], ['-20..-12', b(G, -20, -12)], ['-12..-6', b(G, -12, -5)]],
  'noise (dBFS)': [['-62..-50', b(N, -63, -50)], ['-50..-42', b(N, -50, -42)], ['-42..-34', b(N, -42, -33)]],
};

export function breakdownTable(rows: CaseResult[], hit: (r: CaseResult) => boolean): string {
  const lines = ['| factor | bin | k/n | rate [95% CI] |', '|---|---|---|---|'];
  for (const [factor, bins] of Object.entries(BINS)) {
    for (const [name, inBin] of bins) {
      const sel = rows.filter(inBin);
      const r = wilson(sel.filter(hit).length, sel.length);
      lines.push(`| ${factor} | ${name} | ${r.k}/${r.n} | ${r.n ? pct(r) : 'n/a'} |`);
    }
  }
  return lines.join('\n');
}
