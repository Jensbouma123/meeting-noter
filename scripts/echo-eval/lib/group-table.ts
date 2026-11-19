import type { CaseResult } from '../types/case-result';
import type { Group } from '../types/group';
import { factorsOf, langOf } from './factors';
import { pct, wilson } from './stats';

const FACTORS = ['linear bleed only', 'clipping', 'compression', 'clock drift', 'AEC residual', 'double-talk'];

export const languageGroups = (kind: 'echo' | 'crosstalk'): Group[] =>
  (['nl', 'en'] as const).map((l) => [l, (r) => langOf(kind === 'echo' ? r.systemUtt : r.micUtt) === l]);

export const pairGroups: Group[] = ['nl', 'en'].flatMap((s) =>
  ['nl', 'en'].map((m): Group => [`system ${s} / mic ${m}`, (r) => langOf(r.systemUtt) === s && langOf(r.micUtt) === m]),
);

export const factorGroups: Group[] = FACTORS.map((f) => [f, (r) => factorsOf(r).includes(f)]);

export function groupTable(rows: CaseResult[], groups: Group[], hit: (r: CaseResult) => boolean): string {
  const lines = ['| group | k/n | rate [95% CI] | upper bound |', '|---|---|---|---|'];
  for (const [name, inGroup] of groups) {
    const sel = rows.filter(inGroup);
    const r = wilson(sel.filter(hit).length, sel.length);
    lines.push(`| ${name} | ${r.k}/${r.n} | ${r.n ? pct(r) : 'n/a'} | ${r.n ? `${(100 * r.hi).toFixed(1)}%` : 'n/a'} |`);
  }
  return lines.join('\n');
}
