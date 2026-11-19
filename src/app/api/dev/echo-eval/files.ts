import fs from 'node:fs';
import path from 'node:path';
import type { CaseResult } from '../../../../../scripts/echo-eval/types/case-result';
import { OUT_DIR, markerFileFor, resultsFileFor } from '../../../../../scripts/echo-eval/out-dir';

export const META = path.join(OUT_DIR, 'meta.json');

export function doneIds(fake = false): string[] {
  const file = resultsFileFor(fake);
  if (!fs.existsSync(file)) return [];
  const ids = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => (JSON.parse(l) as CaseResult).id);
  return [...new Set(ids)];
}

export function begin(meta: unknown, fake = false): void {
  fs.rmSync(markerFileFor(fake), { force: true });
  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
}

export function appendResult(result: unknown, fake = false): void {
  fs.appendFileSync(resultsFileFor(fake), `${JSON.stringify(result)}\n`);
}

export function mark(body: { ok: boolean; error?: string }, fake = false): void {
  fs.writeFileSync(markerFileFor(fake), JSON.stringify(body));
}

export function markerState(fake = false): { finished: boolean; error: string | null } {
  const file = markerFileFor(fake);
  if (!fs.existsSync(file)) return { finished: false, error: null };
  const m = JSON.parse(fs.readFileSync(file, 'utf8')) as { ok: boolean; error?: string };
  return { finished: m.ok, error: m.ok ? null : (m.error ?? 'failed') };
}
