import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectInstall } from './detect-install';
import { makeInstallerRoot } from './test-fixtures';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'mn-update-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe('detectInstall', () => {
  it('recognises a curl install from MEETING_NOTER_ROOT or from the server cwd', () => {
    const root = makeInstallerRoot(dir);
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
