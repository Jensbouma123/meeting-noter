import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function makeInstallerRoot(dir: string, version = '0.2.3') {
  const root = path.join(dir, 'Meeting Noter');
  mkdirSync(path.join(root, 'app', 'server'), { recursive: true });
  writeFileSync(path.join(root, 'app', 'VERSION'), `${version}\n`);
  writeFileSync(path.join(root, 'app', 'ARCH'), 'arm64\n');
  return root;
}
