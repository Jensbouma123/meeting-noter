import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAlive, killIfStillRunning, startNodeListener, waitUntilGone } from './install-sandbox/node-listener';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox } from './install-sandbox/sandbox';

const pending = () => existsSync(path.join(installRoot(), 'legacy-origin.pending'));
const install = (version: string) => {
  publishRelease(version);
  const r = runScript(INSTALL);
  expect(r.code, r.out).toBe(0);
};

describe.skipIf(process.platform !== 'darwin')('install.sh legacy origin (port 3000 before 0.6.0)', () => {
  useInstallSandbox();

  it('a fresh install has nothing to migrate', () => {
    install('0.6.0');
    expect(pending()).toBe(false);
  });

  it('an update from before 0.6.0 marks the browser data hand-over as pending', () => {
    install('0.5.1');
    expect(pending()).toBe(false);
    install('0.6.0');
    expect(pending()).toBe(true);
  });

  it('an update between 0.6.x versions, or after the hand-over, does not', () => {
    install('0.6.0');
    install('0.6.1');
    expect(pending()).toBe(false);
    install('0.5.1');
    writeFileSync(path.join(installRoot(), 'legacy-origin.done'), '');
    install('0.6.2');
    expect(pending()).toBe(false);
  });

  it('an update stops our old server on the legacy port even without a pid file, and spares others', async () => {
    install('0.5.1');
    const ours = await startNodeListener(
      path.join(installRoot(), 'app/node-listener'),
      path.join(installRoot(), 'app'),
    );
    const foreign = await startNodeListener(path.join(sandbox.dir, 'elsewhere/node'), sandbox.dir);
    try {
      publishRelease('0.6.0');
      expect(runScript(INSTALL, { MEETING_NOTER_LEGACY_PORT: String(ours.port) }).code).toBe(0);
      await waitUntilGone(ours.pid);
      expect(isAlive(ours.pid)).toBe(false);
      publishRelease('0.6.1');
      expect(runScript(INSTALL, { MEETING_NOTER_LEGACY_PORT: String(foreign.port) }).code).toBe(0);
      expect(isAlive(foreign.pid)).toBe(true);
    } finally {
      killIfStillRunning(ours.pid);
      killIfStillRunning(foreign.pid);
    }
  }, 60_000);
});
