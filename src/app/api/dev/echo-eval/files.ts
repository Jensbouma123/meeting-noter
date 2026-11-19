import fs from 'node:fs';
import path from 'node:path';
import type { CaseResult } from '../../../../../scripts/echo-eval/types/case-result';
import { OUT_DIR, RESULTS_FILE } from '../../../../../scripts/echo-eval/out-dir';

const MARKER = path.join(OUT_DIR, 'finished.json');
export const META = path.join(OUT_DIR, 'meta.json');

export function doneIds(): string[] {
  if (!fs.existsSync(RESULTS_FILE)) return [];
  return fs
    .readFileSync(RESULTS_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => (JSON.parse(l) as CaseResult).id);
}

export function begin(meta: unknown): void {
  fs.rmSync(MARKER, { force: true });
  fs.writeFileSync(META, JSON.stringify(meta, null, 2));
}

export function appendResult(result: unknown): void {
  fs.appendFileSync(RESULTS_FILE, `${JSON.stringify(result)}\n`);
}

export function mark(body: { ok: boolean; error?: string }): void {
  fs.writeFileSync(MARKER, JSON.stringify(body));
}

export function markerState(): { finished: boolean; error: string | null } {
  if (!fs.existsSync(MARKER)) return { finished: false, error: null };
  const m = JSON.parse(fs.readFileSync(MARKER, 'utf8')) as { ok: boolean; error?: string };
  return { finished: m.ok, error: m.ok ? null : (m.error ?? 'failed') };
}
