import fs from 'node:fs';
import path from 'node:path';
import type { CaseResult } from '../../../../../scripts/echo-eval/types/case-result';
import type { Shard } from '../../../../../scripts/echo-eval/types/shard';
import { OUT_DIR, markerFileFor, resultsFileFor } from '../../../../../scripts/echo-eval/out-dir';

export const META = path.join(OUT_DIR, 'meta.json');

export function doneIds(fake = false, meetings = false, shard: Shard | null = null): string[] {
  const file = resultsFileFor(fake, meetings, shard);
  if (!fs.existsSync(file)) return [];
  const ids = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => (JSON.parse(l) as CaseResult).id);
  return [...new Set(ids)];
}

export function begin(meta: unknown, fake = false, meetings = false, shard: Shard | null = null): void {
  fs.rmSync(markerFileFor(fake, meetings, shard), { force: true });
  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
}

export function appendResult(result: unknown, fake = false, meetings = false, shard: Shard | null = null): void {
  fs.appendFileSync(resultsFileFor(fake, meetings, shard), `${JSON.stringify(result)}\n`);
}

export function mark(body: { ok: boolean; error?: string }, fake = false, meetings = false, shard: Shard | null = null): void {
  fs.writeFileSync(markerFileFor(fake, meetings, shard), JSON.stringify(body));
}

export function markerState(
  fake = false,
  meetings = false,
  shard: Shard | null = null,
): { finished: boolean; error: string | null } {
  const file = markerFileFor(fake, meetings, shard);
  if (!fs.existsSync(file)) return { finished: false, error: null };
  const m = JSON.parse(fs.readFileSync(file, 'utf8')) as { ok: boolean; error?: string };
  return { finished: m.ok, error: m.ok ? null : (m.error ?? 'failed') };
}
