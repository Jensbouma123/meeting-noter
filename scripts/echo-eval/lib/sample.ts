import type { EvalCase } from '../types/eval-case';
import { hashString } from './rng';

function mixedFirst(rows: EvalCase[], n: number): EvalCase[] {
  const mixed = [...rows].sort((a, b) => hashString(a.id) - hashString(b.id));
  return mixed.slice(0, n);
}

export function sampleDev(cases: EvalCase[], n: number): EvalCase[] {
  const dev = cases.filter((c) => c.split === 'dev');
  const echo = dev.filter((c) => c.kind === 'echo');
  const cross = dev.filter((c) => c.kind === 'crosstalk');
  const nCross = Math.round((n * cross.length) / dev.length);
  return [...mixedFirst(echo, n - nCross), ...mixedFirst(cross, nCross)];
}
