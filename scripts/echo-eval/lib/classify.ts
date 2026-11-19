import type { CaseResult } from '../types/case-result';

const tokens = (t: string): string[] => t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function dice(a: string, b: string): number {
  const x = tokens(a);
  const pool = new Map<string, number>();
  for (const t of tokens(b)) pool.set(t, (pool.get(t) ?? 0) + 1);
  let shared = 0;
  for (const t of x) {
    const left = pool.get(t) ?? 0;
    if (left > 0) {
      shared += 1;
      pool.set(t, left - 1);
    }
  }
  const n = x.length + tokens(b).length;
  return n ? (2 * shared) / n : 0;
}

export const DUP_SIMILARITY = 0.3;

export const echoPresent = (r: CaseResult): boolean => r.micAsr.some((s) => tokens(s.text).length > 0);

export function isMiss(r: CaseResult): boolean {
  const sys = r.systemAsr.map((s) => s.text).join(' ');
  return r.micSurvivors.some((s) => dice(s.text, sys) >= DUP_SIMILARITY);
}

export const isJunk = (r: CaseResult): boolean => r.micSurvivors.length > 0 && !isMiss(r);

const genuine = (r: CaseResult) => r.micAsr.filter((s) => tokens(s.text).length >= 2);

export const isFalseDrop = (r: CaseResult): boolean => r.micDropped.some((s) => tokens(s.text).length >= 2);

export const isAllLost = (r: CaseResult): boolean => genuine(r).length > 0 && r.micSurvivors.every((s) => tokens(s.text).length < 2);
