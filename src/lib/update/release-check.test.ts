import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCheck } from './release-check';
import type { InstallInfo } from './types';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'mn-update-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
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
