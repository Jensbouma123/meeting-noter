import type { CaseResult } from '../types/case-result';

export const langOf = (id: string | null): 'nl' | 'en' | null => (id === null ? null : id.startsWith('nl-') ? 'nl' : 'en');

export function factorsOf(r: Pick<CaseResult, 'kind' | 'bleed'>): string[] {
  const b = r.bleed;
  if (!b) return [];
  const f: string[] = [];
  if (b.clipDrive) f.push('clipping');
  if (b.compressRatio) f.push('compression');
  if (b.driftPpm) f.push('clock drift');
  if (b.aecDb) f.push('AEC residual');
  if (r.kind === 'crosstalk') f.push('double-talk');
  if (!f.length || (f.length === 1 && f[0] === 'double-talk')) f.push('linear bleed only');
  return f;
}
