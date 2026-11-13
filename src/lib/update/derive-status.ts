import { IDLE_STATUS } from './constants';
import type { UpdateExit, UpdateMeta, UpdateStatus } from './types';

function visibleLogLines(log: string): string[] {
  return log
    .split(/\n/)
    .map((l) => (l.split('\r').filter((s) => s.trim()).pop() ?? '').trimEnd())
    .filter((l) => l.trim());
}

function lastPercentAfter(log: string, marker: string | null): number | null {
  const from = marker === null ? 0 : log.lastIndexOf(marker);
  if (from < 0) return null;
  const all = [...log.slice(from).matchAll(/(\d{1,3}(?:[.,]\d+)?)%/g)];
  if (!all.length) return null;
  return Math.min(100, Number(all[all.length - 1][1].replace(',', '.')));
}

function finishedStatus(base: UpdateStatus, meta: UpdateMeta, log: string, lines: string[], exit: UpdateExit): UpdateStatus {
  const finished = { ...base, finishedAt: exit.at };
  const installer = meta.kind === 'installer';
  if (exit.code === 0) {
    if (installer) {
      const same = log.includes('al de nieuwste versie');
      return { ...finished, state: 'done', code: same ? 'already-latest' : 'updated' };
    }
    if (log.includes('Al up-to-date')) return { ...finished, state: 'done', code: 'already-latest' };
    return { ...finished, state: 'done', restartRequired: true, code: 'updated-restart-required' };
  }
  const reason = [...lines].reverse().find((l) => l.trimStart().startsWith('❌'));
  const code = installer && log.includes('Vorige versie') ? 'rolled-back' : 'failed';
  return { ...finished, state: 'failed', code, detail: reason ? reason.replace('❌', '').trim() : null };
}

function runningStatus(base: UpdateStatus, meta: UpdateMeta, log: string): UpdateStatus {
  const running = { ...base, state: 'running' as const };
  if (meta.kind !== 'installer') {
    return { ...running, phase: 'downloading', percent: lastPercentAfter(log, null), code: 'downloading' };
  }
  if (log.includes('GPU-spraakmodel voorbereiden')) return { ...running, phase: 'model', code: 'building-model' };
  if (log.includes('uitgepakt') || log.includes('al de nieuwste versie')) {
    return { ...running, phase: 'restarting', code: 'restarting' };
  }
  if (log.includes('Downloaden:')) {
    const percent = lastPercentAfter(log, 'Downloaden:');
    if (percent !== null && percent >= 100) return { ...running, phase: 'installing', code: 'installing' };
    return { ...running, phase: 'downloading', percent, code: 'downloading' };
  }
  return { ...running, phase: 'starting', code: 'preparing' };
}

export function deriveStatus(meta: UpdateMeta | null, log: string, exit: UpdateExit | null, alive: boolean): UpdateStatus {
  if (!meta) return IDLE_STATUS;
  const lines = visibleLogLines(log);
  const base = {
    ...IDLE_STATUS,
    fromVersion: meta.fromVersion,
    toVersion: meta.toVersion,
    startedAt: meta.startedAt,
    logTail: lines.slice(-20).join('\n'),
  };
  if (exit) return finishedStatus(base, meta, log, lines, exit);
  if (!alive) return { ...base, state: 'failed', code: 'interrupted' };
  return runningStatus(base, meta, log);
}
