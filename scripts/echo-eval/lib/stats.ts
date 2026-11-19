import type { Item } from '../types/item';
import type { Rate } from '../types/rate';
import { makeRng } from './rng';

export function wilson(k: number, n: number): Rate {
  if (n === 0) return { k, n, p: NaN, lo: NaN, hi: NaN };
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { k, n, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

export function perGroup(items: Item[]): { groups: number; mean: number; lo: number; hi: number; anyHit: Rate } {
  const by = new Map<string, boolean[]>();
  for (const i of items) by.set(i.group, [...(by.get(i.group) ?? []), i.hit]);
  const rates = [...by.values()].map((h) => h.filter(Boolean).length / h.length);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const rng = makeRng(7);
  const boots = Array.from({ length: 2000 }, () => mean(rates.map(() => rates[Math.floor(rng() * rates.length)]))).sort((a, b) => a - b);
  const anyHit = wilson([...by.values()].filter((h) => h.some(Boolean)).length, by.size);
  return { groups: by.size, mean: mean(rates), lo: boots[Math.floor(0.025 * boots.length)], hi: boots[Math.floor(0.975 * boots.length)], anyHit };
}

export const pct = (r: { p?: number; lo: number; hi: number }, p = r.p ?? NaN): string =>
  `${(100 * p).toFixed(1)}% [${(100 * r.lo).toFixed(1)}, ${(100 * r.hi).toFixed(1)}]`;
