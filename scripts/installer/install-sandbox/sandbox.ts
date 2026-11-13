import { chmodSync, mkdirSync, mkdtempSync, existsSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach } from 'vitest';
import { fakeMac } from './fake-mac';

const installerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INSTALL = path.join(installerDir, 'install.sh');
export const UNINSTALL = path.join(installerDir, 'uninstall.sh');

export const sandbox = { dir: '', home: '', base: '', shims: '' };

export const installRoot = () => path.join(sandbox.home, 'Library/Application Support/Meeting Noter');

export const leftoverUpdateDirs = () =>
  ['app.old', 'app.new', 'app.failed'].filter((d) => existsSync(path.join(installRoot(), d)));

export function writeExecutable(file: string, body: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body);
  chmodSync(file, 0o755);
}

export function useInstallSandbox() {
  beforeEach(() => {
    sandbox.dir = mkdtempSync(path.join(realpathSync(tmpdir()), 'mn-install-'));
    sandbox.home = path.join(sandbox.dir, 'home');
    sandbox.base = path.join(sandbox.dir, 'release');
    sandbox.shims = path.join(sandbox.dir, 'shims');
    mkdirSync(sandbox.home);
    mkdirSync(sandbox.base);
    fakeMac();
  });
  afterEach(() => rmSync(sandbox.dir, { recursive: true, force: true }));
}
