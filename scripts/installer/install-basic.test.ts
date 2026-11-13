import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fakeMac } from './install-sandbox/fake-mac';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox } from './install-sandbox/sandbox';

const installedVersion = () => readFileSync(path.join(installRoot(), 'app/VERSION'), 'utf8').trim();
const startedVersions = () => readFileSync(path.join(sandbox.home, 'starts'), 'utf8').trim().split('\n');
const launchAgent = (name: string) => path.join(sandbox.home, 'Library/LaunchAgents', `nl.jensbouma.meeting-noter.${name}.plist`);

describe.skipIf(process.platform !== 'darwin')('install.sh', () => {
  useInstallSandbox();

  it('installs the app, the audio-helper LaunchAgent and the .app (no server agent)', () => {
    publishRelease('0.2.0');
    const r = runScript(INSTALL);
    expect(r.out).toContain('Meeting Noter 0.2.0 is geïnstalleerd');
    expect(r.code).toBe(0);
    expect(installedVersion()).toBe('0.2.0');
    expect(readFileSync(path.join(installRoot(), 'bin/meeting-noter-audio-helper'), 'utf8')).toContain('helper-v1');
    expect(existsSync(path.join(installRoot(), 'uninstall.sh'))).toBe(true);
    expect(spawnSync('plutil', ['-lint', '-s', launchAgent('audio-helper')]).status).toBe(0);
    expect(existsSync(launchAgent('server'))).toBe(false);
    const app = path.join(sandbox.home, 'Applications/Meeting Noter.app/Contents');
    expect(readFileSync(path.join(app, 'Info.plist'), 'utf8')).toContain('<string>0.2.0</string>');
    expect(statSync(path.join(app, 'MacOS/meeting-noter')).mode & 0o111).not.toBe(0);
  });

  it('migrates an older install: removes the server LaunchAgent', () => {
    publishRelease('0.2.0');
    const plist = launchAgent('server');
    mkdirSync(path.dirname(plist), { recursive: true });
    writeFileSync(plist, '<plist/>');
    const r = runScript(INSTALL);
    expect(r.code, r.out).toBe(0);
    expect(existsSync(plist)).toBe(false);
  });

  it('downloads nothing when the newest version is already installed', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    rmSync(path.join(sandbox.base, 'meeting-noter-macos-arm64.tar.gz'));
    const r = runScript(INSTALL);
    expect(r.out).toContain('al de nieuwste versie (0.2.0)');
    expect(r.code).toBe(0);
  });

  it('updates to a newer release and keeps an unchanged helper file', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    const helper = path.join(installRoot(), 'bin/meeting-noter-audio-helper');
    const before = statSync(helper).ino;
    publishRelease('0.3.0');
    expect(runScript(INSTALL).code).toBe(0);
    expect(installedVersion()).toBe('0.3.0');
    expect(statSync(helper).ino).toBe(before);
    publishRelease('0.4.0', { helper: 'helper-v2' });
    expect(runScript(INSTALL).code).toBe(0);
    expect(readFileSync(helper, 'utf8')).toContain('helper-v2');
  });

  it('MEETING_NOTER_FORCE reinstalls the same version; a plain re-run does not', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' }).code).toBe(0);
    expect(runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1' }).out).toContain('al de nieuwste versie');
    const r = runScript(INSTALL, { MEETING_NOTER_RUN_SERVER: '1', MEETING_NOTER_FORCE: '1' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Downloaden');
    expect(startedVersions()).toEqual(['0.2.0', '0.2.0', '0.2.0']);
  });

  it('refuses Intel Macs with a friendly message and installs nothing', () => {
    fakeMac({ arm64: '0' });
    publishRelease('0.2.0');
    const r = runScript(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Intel Macs worden nog niet ondersteund');
    expect(r.out).toContain('Intel Macs are not supported yet');
    expect(existsSync(installRoot())).toBe(false);
  });

  it('skips the audio helper before macOS 14.4 and stops before 13.5', () => {
    publishRelease('0.2.0');
    fakeMac({ version: '14.3.1' });
    const r = runScript(INSTALL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('macOS 14.4 of nieuwer');
    expect(existsSync(launchAgent('audio-helper'))).toBe(false);

    fakeMac({ version: '13.4' });
    const old = runScript(INSTALL, { MEETING_NOTER_FORCE: '1' });
    expect(old.code).not.toBe(0);
    expect(old.out).toContain('te oud');
  });

  it('fails clearly when the release has no tarball yet', () => {
    const r = runScript(INSTALL);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('Kon de nieuwste versie niet ophalen');
  });
});
