import type { CaseResult } from '../types/case-result';

const tokens = (t: string): string[] => t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function dice(a: string, b: string): number {
  const x = tokens(a);
  const pool = new Map<string, number>();
  for (const t of tokens(b)) pool.set(t, (pool.get(t) ?? 0) + 1);
  let shared = 0;
  for (const t of x) {
    const left = pool.get(t) ?? 0;
    if (left > 0) (shared += 1), pool.set(t, left - 1);
  }
  const n = x.length + tokens(b).length;
  return n ? (2 * shared) / n : 0;
}

export const DUP_SIMILARITY = 0.3;

/** Echo case: ASR heard something on the mic (otherwise there is no duplicate to miss). */
export const echoPresent = (r: CaseResult): boolean => r.micAsr.some((s) => tokens(s.text).length > 0);

/** Miss: a surviving mic line still repeats the system text. */
export function isMiss(r: CaseResult): boolean {
  const sys = r.systemAsr.map((s) => s.text).join(' ');
  return r.micSurvivors.some((s) => dice(s.text, sys) >= DUP_SIMILARITY);
}

/** Junk: a mic line survives that is not a duplicate (hallucinated noise text). */
export const isJunk = (r: CaseResult): boolean => r.micSurvivors.length > 0 && !isMiss(r);

const genuine = (r: CaseResult) => r.micAsr.filter((s) => tokens(s.text).length >= 2);

/** False drop: a genuine (>=2 word) mic line was removed. */
export const isFalseDrop = (r: CaseResult): boolean => r.micDropped.some((s) => tokens(s.text).length >= 2);

/** Strict false drop: every genuine mic line vanished, the local speaker is lost entirely. */
export const isAllLost = (r: CaseResult): boolean => genuine(r).length > 0 && r.micSurvivors.every((s) => tokens(s.text).length < 2);
