import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishRelease, writeChecksumFor } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, leftoverUpdateDirs, sandbox, useInstallSandbox } from './install-sandbox/sandbox';

const installedVersion = () => readFileSync(path.join(installRoot(), 'app/VERSION'), 'utf8').trim();
const installedSum = () => readFileSync(path.join(installRoot(), 'installed.sha256'), 'utf8');
const ASSET = 'meeting-noter-macos-arm64.tar.gz';

describe.skipIf(process.platform !== 'darwin')('install.sh failures and recovery', () => {
  useInstallSandbox();

  it('refuses a download whose checksum does not match and keeps the old install', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    publishRelease('0.3.0');
    writeFileSync(path.join(sandbox.base, `${ASSET}.sha256`), `${'0'.repeat(64)}  x\n`);
    const r = runScript(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Controlesom klopt niet');
    expect(installedVersion()).toBe('0.2.0');
  });

  it('rolls back to the previous version when the new one does not start', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' }).code).toBe(0);
    const sum = installedSum();
    publishRelease('0.3.0', { launcher: 'exit 1' });
    const r = runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Meeting Noter 0.3.0 startte niet');
    expect(r.out).toContain('Vorige versie 0.2.0 teruggezet');
    expect(installedVersion()).toBe('0.2.0');
    expect(readFileSync(path.join(sandbox.home, 'starts'), 'utf8').trim().split('\n')).toEqual(['0.2.0', '0.3.0', '0.2.0']);
    for (const d of ['app.old', 'app.new', 'app.failed']) expect(existsSync(path.join(installRoot(), d)), d).toBe(false);
    expect(installedSum()).toBe(sum);
  });

  it('keeps the old install when the tarball is corrupt but its checksum matches', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    const sum = installedSum();
    writeFileSync(path.join(sandbox.base, ASSET), 'this is not a gzip');
    writeChecksumFor(ASSET);
    const r = runScript(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Uitpakken mislukt');
    expect(installedVersion()).toBe('0.2.0');
    expect(installedSum()).toBe(sum);
    expect(leftoverUpdateDirs()).toEqual([]);
  });

  it('keeps the old install when the bundled Node.js does not run', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    publishRelease('0.3.0', { node: 'exit 1' });
    const r = runScript(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('De meegeleverde Node.js start niet');
    expect(installedVersion()).toBe('0.2.0');
    expect(leftoverUpdateDirs()).toEqual([]);
  });

  it('a first install whose server does not start is retried, not called up to date', () => {
    publishRelease('0.2.0', { launcher: 'exit 1' });
    const r = runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('startte niet');
    expect(existsSync(path.join(installRoot(), 'installed.sha256'))).toBe(false);
    publishRelease('0.2.0');
    const again = runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' });
    expect(again.code, again.out).toBe(0);
    expect(again.out).not.toContain('al de nieuwste versie');
    expect(existsSync(path.join(installRoot(), 'installed.sha256'))).toBe(true);
    expect(leftoverUpdateDirs()).toEqual([]);
  });

  it('restores app.old left behind by an update cut off mid-swap', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    execFileSync('mv', [path.join(installRoot(), 'app'), path.join(installRoot(), 'app.old')]);
    rmSync(path.join(sandbox.base, ASSET));
    const r = runScript(INSTALL);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('al de nieuwste versie (0.2.0)');
    expect(existsSync(path.join(installRoot(), 'app.old'))).toBe(false);
  });
});
