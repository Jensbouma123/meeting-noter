import type { EvalCase } from '../types/eval-case';

function strided(rows: EvalCase[], n: number): EvalCase[] {
  if (n >= rows.length) return rows;
  return Array.from({ length: n }, (_, i) => rows[Math.floor((i * rows.length) / n)]);
}

export function sampleDev(cases: EvalCase[], n: number): EvalCase[] {
  const dev = cases.filter((c) => c.split === 'dev');
  const echo = dev.filter((c) => c.kind === 'echo');
  const cross = dev.filter((c) => c.kind === 'crosstalk');
  const nCross = Math.round((n * cross.length) / dev.length);
  return [...strided(echo, n - nCross), ...strided(cross, nCross)];
}
