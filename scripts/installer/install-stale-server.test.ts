import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAlive, killIfStillRunning, startNodeListener, waitUntilGone } from './install-sandbox/node-listener';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox } from './install-sandbox/sandbox';

describe.skipIf(process.platform !== 'darwin')('install.sh stale server', () => {
  useInstallSandbox();

  it('update stops the on-demand server on the port even without a pid file, and spares foreign listeners', async () => {
    publishRelease('0.2.0');
    expect(runScript(INSTALL).code).toBe(0);
    const ours = await startNodeListener(path.join(installRoot(), 'app/node-listener'), path.join(installRoot(), 'app'));
    const env = { MEETING_NOTER_PORT: String(ours.port) };
    try {
      publishRelease('0.2.1');
      const r = runScript(INSTALL, env);
      expect(r.code, r.out).toBe(0);
      await waitUntilGone(ours.pid);
      expect(isAlive(ours.pid)).toBe(false);
    } finally { killIfStillRunning(ours.pid); }

    const foreign = await startNodeListener(path.join(sandbox.dir, 'elsewhere/node'), sandbox.dir);
    try {
      publishRelease('0.2.2');
      const r = runScript(INSTALL, { MEETING_NOTER_PORT: String(foreign.port) });
      expect(r.code, r.out).toBe(0);
      expect(isAlive(foreign.pid)).toBe(true);
    } finally { killIfStillRunning(foreign.pid); }
  }, 60_000);
});
