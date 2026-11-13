import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fakeLaunchctl } from './install-sandbox/fake-launchctl';
import { INSTALL, sandbox, useInstallSandbox } from './install-sandbox/sandbox';

describe.skipIf(process.platform !== 'darwin')('install.sh agent_start', () => {
  useInstallSandbox();

  function startAgent(label: string) {
    const agents = path.join(sandbox.home, 'Library/LaunchAgents');
    mkdirSync(agents, { recursive: true });
    writeFileSync(path.join(agents, `${label}.plist`), '<plist/>');
    const script = `export MEETING_NOTER_SOURCE_ONLY=1; source "${INSTALL}"; agent_start "${label}"`;
    const r = spawnSync('/bin/bash', ['-c', script], {
      env: { NODE_ENV: 'test', PATH: `${sandbox.shims}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: sandbox.home },
      encoding: 'utf8',
    });
    return { code: r.status, out: r.stdout + r.stderr };
  }

  it('retries bootstrap after the I/O error 5 that bootout leaves behind', () => {
    const calls = fakeLaunchctl({ fails: 1 });
    const r = startAgent('nl.jensbouma.meeting-noter.server');
    expect(r.code, r.out).toBe(0);
    const lines = calls();
    expect(lines.filter((l) => l.startsWith('bootstrap'))).toHaveLength(2);
    expect(lines.some((l) => l.startsWith('kickstart'))).toBe(false);
  });

  it('kickstarts the label when it stays loaded and bootstrap keeps failing', () => {
    const calls = fakeLaunchctl({ fails: 99, stuck: true });
    const r = startAgent('nl.jensbouma.meeting-noter.audio-helper');
    expect(r.code, r.out).toBe(0);
    expect(calls().some((l) => l.startsWith('kickstart -k gui/'))).toBe(true);
  }, 60_000);
});
