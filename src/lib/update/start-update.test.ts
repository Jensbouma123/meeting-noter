import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectInstall } from './detect-install';
import { startUpdate } from './start-update';
import { makeInstallerRoot } from './test-fixtures';
import { readUpdateStatus, updateRunning } from './update-files';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'mn-update-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(process.platform === 'win32')('startUpdate', () => {
  async function waitDone(stateDir: string) {
    for (let i = 0; i < 100 && updateRunning(stateDir); i++) await new Promise((r) => setTimeout(r, 50));
    return readUpdateStatus(stateDir);
  }

  it('runs the downloaded install.sh detached and records its outcome', async () => {
    const root = makeInstallerRoot(dir);
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
    const root = makeInstallerRoot(dir);
    vi.stubEnv('MEETING_NOTER_INSTALL_URL', `file://${path.join(dir, 'missing.sh')}`);
    const info = detectInstall({ cwd: '/', env: { NODE_ENV: 'production', MEETING_NOTER_ROOT: root } });
    startUpdate(info, '0.3.0');
    expect(await waitDone(info.stateDir!)).toMatchObject({ state: 'failed', code: 'failed' });
  });
});
