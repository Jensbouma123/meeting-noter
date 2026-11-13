import { existsSync } from 'node:fs';
import path from 'node:path';
import { readTrimmedFile } from './read-trimmed-file';
import type { DetectInstallOptions, InstallInfo } from './types';

export function detectInstall({
  cwd = process.cwd(),
  env = process.env,
  version = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
}: DetectInstallOptions = {}): InstallInfo {
  const fromCwd = path.basename(cwd) === 'server' ? path.resolve(cwd, '..', '..') : null;
  for (const root of [env.MEETING_NOTER_ROOT, fromCwd]) {
    if (!root) continue;
    const current = readTrimmedFile(path.join(root, 'app', 'VERSION'));
    const arch = readTrimmedFile(path.join(root, 'app', 'ARCH'));
    if (current && arch) {
      return { kind: 'installer', current, root, arch, appDir: path.join(root, 'app'), stateDir: path.join(root, 'logs') };
    }
  }
  const base = { current: version, root: null, arch: null, appDir: cwd };
  if (env.NODE_ENV !== 'production') return { ...base, kind: 'dev', stateDir: null };
  if (existsSync(path.join(cwd, 'scripts', 'update.mjs'))) {
    const kind = existsSync(path.join(cwd, '.git')) ? 'git' : 'source';
    return { ...base, kind, stateDir: path.join(cwd, '.runtime') };
  }
  return { ...base, kind: 'unknown', stateDir: null };
}
