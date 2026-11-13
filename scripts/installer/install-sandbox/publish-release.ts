import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { UNINSTALL, sandbox, writeExecutable } from './sandbox';

export function publishRelease(version: string, { arch = 'arm64', helper = 'helper-v1', launcher = '', node = 'exit 0' } = {}) {
  const stage = path.join(sandbox.dir, `stage-${arch}`, 'meeting-noter');
  rmSync(path.dirname(stage), { recursive: true, force: true });
  writeExecutable(path.join(stage, 'node/bin/node'), `#!/bin/sh\n${node}\n`);
  writeExecutable(path.join(stage, 'helper/meeting-noter-audio-helper'), `#!/bin/sh\n# ${helper}\n`);
  mkdirSync(path.join(stage, 'server'), { recursive: true });
  writeFileSync(path.join(stage, 'server/server.js'), '');
  mkdirSync(path.join(stage, 'launcher'), { recursive: true });
  writeFileSync(path.join(stage, 'launcher/AppIcon.icns'), 'icns');
  writeExecutable(path.join(stage, 'launcher/launcher.sh'), `#!/bin/bash\necho ${version} >> "$HOME/starts"\n${launcher}\n`);
  writeFileSync(path.join(stage, 'uninstall.sh'), readFileSync(UNINSTALL));
  writeFileSync(path.join(stage, 'VERSION'), `${version}\n`);
  writeFileSync(path.join(stage, 'ARCH'), `${arch}\n`);
  const asset = `meeting-noter-macos-${arch}.tar.gz`;
  execFileSync('tar', ['-czf', path.join(sandbox.base, asset), '-C', path.dirname(stage), 'meeting-noter'], {
    env: { ...process.env, COPYFILE_DISABLE: '1' },
  });
  writeChecksumFor(asset);
}

export function writeChecksumFor(asset: string) {
  execFileSync('/bin/sh', ['-c', `shasum -a 256 ${asset} > ${asset}.sha256`], { cwd: sandbox.base });
}
