import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCheck,
  deriveStatus,
  detectInstall,
  readUpdateStatus,
  startUpdate,
  updateRunning,
  type InstallInfo,
  type UpdateMeta,
} from './server-update';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'mn-update-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

function installerRoot(version = '0.2.3') {
  const root = path.join(dir, 'Meeting Noter');
  mkdirSync(path.join(root, 'app', 'server'), { recursive: true });
  writeFileSync(path.join(root, 'app', 'VERSION'), `${version}\n`);
  writeFileSync(path.join(root, 'app', 'ARCH'), 'arm64\n');
  return root;
}

describe('detectInstall', () => {
  it('recognises a curl install from MEETING_NOTER_ROOT or from the server cwd', () => {
    const root = installerRoot();
    const viaEnv = detectInstall({ cwd: '/', env: { NODE_ENV: 'production', MEETING_NOTER_ROOT: root } });
    expect(viaEnv).toMatchObject({ kind: 'installer', current: '0.2.3', arch: 'arm64', stateDir: path.join(root, 'logs') });
    const viaCwd = detectInstall({ cwd: path.join(root, 'app', 'server'), env: { NODE_ENV: 'production' } });
    expect(viaCwd.kind).toBe('installer');
  });

  it('tells git, source, dev and unknown installs apart', () => {
    const repo = path.join(dir, 'repo');
    mkdirSync(path.join(repo, 'scripts'), { recursive: true });
    writeFileSync(path.join(repo, 'scripts', 'update.mjs'), '');
    const prod = { NODE_ENV: 'production' as const };
    expect(detectInstall({ cwd: repo, env: prod, version: '1.0.0' })).toMatchObject({ kind: 'source', current: '1.0.0' });
    mkdirSync(path.join(repo, '.git'));
    expect(detectInstall({ cwd: repo, env: prod }).kind).toBe('git');
    expect(detectInstall({ cwd: repo, env: { NODE_ENV: 'development' } }).kind).toBe('dev');
    expect(detectInstall({ cwd: dir, env: prod })).toMatchObject({ kind: 'unknown', stateDir: null });
  });
});

describe('buildCheck', () => {
  const rel = (assetNames: string[]) => ({
    version: '0.3.0',
    tag: 'v0.3.0',
    zipballUrl: null,
    pageUrl: 'p',
    name: 'v0.3.0',
    notes: 'Nieuw',
    publishedAt: null,
    assetNames,
  });
  const ready = ['meeting-noter-macos-arm64.tar.gz', 'meeting-noter-macos-arm64.tar.gz.sha256'];
  const info = (kind: InstallInfo['kind']): InstallInfo => ({
    kind,
    current: '0.2.3',
    root: null,
    arch: 'arm64',
    appDir: dir,
    stateDir: dir,
  });

  it('offers the update only once the installer tarball is uploaded', () => {
    expect(buildCheck(info('installer'), rel([]), false)).toMatchObject({ available: false, canApply: false, latest: null });
    expect(buildCheck(info('installer'), rel(ready), false)).toMatchObject({
      available: true,
      canApply: true,
      latest: '0.3.0',
      notes: 'Nieuw',
      restartAutomatic: true,
    });
    expect(buildCheck(info('git'), rel([]), false)).toMatchObject({ available: true, canApply: true, restartAutomatic: false });
  });

  it('says why it cannot apply', () => {
    expect(buildCheck(info('installer'), rel(ready), true).applyBlockedReason).toBe('already-running');
    expect(buildCheck(info('dev'), rel([]), false).applyBlockedReason).toBe('dev-mode');
    expect(buildCheck(info('unknown'), rel([]), false).applyBlockedReason).toBe('unsupported-install');
    expect(buildCheck(info('installer'), null, false)).toMatchObject({ available: false, applyBlockedReason: null });
  });
});

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
    // The progress bar's redraws collapse to their last state in the log tail.
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

describe.skipIf(process.platform === 'win32')('startUpdate', () => {
  async function waitDone(stateDir: string) {
    for (let i = 0; i < 100 && updateRunning(stateDir); i++) await new Promise((r) => setTimeout(r, 50));
    return readUpdateStatus(stateDir);
  }

  it('runs the downloaded install.sh detached and records its outcome', async () => {
    const root = installerRoot();
    const script = path.join(dir, 'install.sh');
    writeFileSync(script, 'echo "Downloaden: x"\necho "✓ Versie 0.3.0 uitgepakt"\necho "no-open=$MEETING_NOTER_NO_OPEN"\necho "✅ klaar"\n');
    vi.stubEnv('MEETING_NOTER_INSTALL_URL', `file://${script}`);
    const info = detectInstall({ cwd: '/', env: { NODE_ENV: 'production', MEETING_NOTER_ROOT: root } });
    const started = startUpdate(info, '0.3.0');
    expect(started.toVersion).toBe('0.3.0');
    const done = await waitDone(info.stateDir!);
    expect(done).toMatchObject({ state: 'done', code: 'updated', fromVersion: '0.2.3' });
    expect(done.logTail).toContain('no-open=1');
  });

  it('reports a failing installer download', async () => {
    const root = installerRoot();
    vi.stubEnv('MEETING_NOTER_INSTALL_URL', `file://${path.join(dir, 'missing.sh')}`);
    const info = detectInstall({ cwd: '/', env: { NODE_ENV: 'production', MEETING_NOTER_ROOT: root } });
    startUpdate(info, '0.3.0');
    expect(await waitDone(info.stateDir!)).toMatchObject({ state: 'failed', code: 'failed' });
  });
});
