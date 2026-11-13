import { readdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox } from './install-sandbox/sandbox';
import { seedMeetings } from './install-sandbox/seed-meetings';

const uninstallScript = () => path.join(installRoot(), 'uninstall.sh');
const meetingNote = () => path.join(installRoot(), 'meetings/2026-11-12-standup-abc.md');
const serverAgent = () => path.join(sandbox.home, 'Library/LaunchAgents/nl.jensbouma.meeting-noter.server.plist');

describe.skipIf(process.platform !== 'darwin')('uninstall.sh and meetings', () => {
  useInstallSandbox();

  it('uninstall.sh removes everything install.sh created', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    const r = runScript(uninstallScript());
    expect(r.code).toBe(0);
    expect(existsSync(installRoot())).toBe(false);
    expect(existsSync(path.join(sandbox.home, 'Applications/Meeting Noter.app'))).toBe(false);
    expect(existsSync(serverAgent())).toBe(false);
  });

  it('an update keeps the meetings database and Markdown files', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    seedMeetings();
    publishRelease('0.2.1');
    const r = runScript(INSTALL);
    expect(r.code, r.out).toBe(0);
    expect(readFileSync(path.join(installRoot(), 'app/VERSION'), 'utf8').trim()).toBe('0.2.1');
    expect(readFileSync(path.join(installRoot(), 'meetings.db'), 'utf8')).toBe('meetings.db');
    expect(existsSync(meetingNote())).toBe(true);
  });

  it('uninstall.sh keeps the meetings unless asked to delete them', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    seedMeetings();
    const r = runScript(uninstallScript());
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('meetings.db');
    expect(readdirSync(installRoot()).sort()).toEqual(['meetings', 'meetings.db', 'meetings.db-shm', 'meetings.db-wal']);
    expect(existsSync(meetingNote())).toBe(true);
    expect(existsSync(path.join(sandbox.home, 'Applications/Meeting Noter.app'))).toBe(false);
  });

  it('uninstall.sh --delete-meetings removes the meetings too', () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    seedMeetings();
    const r = runScript(uninstallScript(), {}, ['--delete-meetings']);
    expect(r.code, r.out).toBe(0);
    expect(existsSync(installRoot())).toBe(false);
  });
});
