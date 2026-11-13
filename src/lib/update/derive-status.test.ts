import { describe, expect, it } from 'vitest';
import { deriveStatus } from './derive-status';
import type { UpdateMeta } from './types';

describe('deriveStatus', () => {
  const meta = (kind: UpdateMeta['kind'] = 'installer'): UpdateMeta => ({
    kind,
    pid: 1,
    fromVersion: '0.2.3',
    toVersion: '0.3.0',
    startedAt: '2026-11-11T10:00:00.000Z',
  });

  it('is idle without a job', () => {
    expect(deriveStatus(null, '', null, false)).toMatchObject({ state: 'idle', code: '' });
  });

  it('follows install.sh through its phases', () => {
    const at = (log: string) => deriveStatus(meta(), log, null, true);
    expect(at('Installatieprogramma ophalen…\n')).toMatchObject({ state: 'running', phase: 'starting', code: 'preparing' });
    const dl = 'Downloaden: meeting-noter-macos-arm64.tar.gz\n\r#####   12.5%\r##########   42.7%';
    expect(at(dl)).toMatchObject({ phase: 'downloading', percent: 42.7, code: 'downloading' });
    expect(at(`${dl}\r####### 100.0%\n`)).toMatchObject({ phase: 'installing', code: 'installing' });
    expect(at(`${dl}\n✓ Versie 0.3.0 uitgepakt\n`)).toMatchObject({ phase: 'restarting', code: 'restarting' });
    expect(at(`${dl}\n✓ Versie 0.3.0 uitgepakt\nSnel GPU-spraakmodel voorbereiden (eenmalig)\n`)).toMatchObject({
      phase: 'model',
      code: 'building-model',
    });
    expect(at(dl).logTail).toBe('Downloaden: meeting-noter-macos-arm64.tar.gz\n##########   42.7%');
  });

  it('reports the outcome from the exit code', () => {
    const exit = (code: number) => ({ code, at: '2026-11-11T10:05:00.000Z' });
    expect(deriveStatus(meta(), '✅ klaar', exit(0), false)).toMatchObject({
      state: 'done',
      code: 'updated',
      finishedAt: '2026-11-11T10:05:00.000Z',
      restartRequired: false,
    });
    expect(deriveStatus(meta(), '✓ U heeft al de nieuwste versie (0.3.0).', exit(0), false).code).toBe('already-latest');
    expect(deriveStatus(meta(), 'x\n❌ Download mislukt.\n   Er ging iets mis', exit(1), false)).toMatchObject({
      state: 'failed',
      code: 'failed',
      detail: 'Download mislukt.',
    });
    const rolledBack = 'x\n❌ Meeting Noter 0.3.0 startte niet. Logbestand: l\n   ↩️  Vorige versie 0.2.3 teruggezet / Previous version restored.\n   Er ging iets mis';
    expect(deriveStatus(meta(), rolledBack, exit(1), false)).toMatchObject({
      state: 'failed',
      code: 'rolled-back',
      detail: 'Meeting Noter 0.3.0 startte niet. Logbestand: l',
    });
    expect(deriveStatus(meta(), 'x\n❌ Download mislukt.\n   Er ging iets mis', exit(1), false).code).toBe('failed');
    expect(deriveStatus(meta('git'), 'Bijgewerkt naar 0.3.0 (git pull).', exit(0), false)).toMatchObject({
      state: 'done',
      code: 'updated-restart-required',
      restartRequired: true,
    });
    expect(deriveStatus(meta('git'), 'Al up-to-date.', exit(0), false).code).toBe('already-latest');
  });

  it('calls a job whose process died without an exit code interrupted', () => {
    expect(deriveStatus(meta(), 'Downloaden: x', null, false)).toMatchObject({ state: 'failed', code: 'interrupted' });
  });
});
