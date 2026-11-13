import { copyFileSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ASSET } from './constants.mjs';
import { standInServerSource } from './server-source.mjs';

const UPDATE_SOURCE_EXCLUDED = (name) => !name.endsWith('.ts') || name.includes('.test.') || name === 'test-fixtures.ts';

function copyUpdateSources(repo, serverDir) {
  const updateDir = path.join(repo, 'src/lib/update');
  for (const file of readdirSync(updateDir).filter((n) => !UPDATE_SOURCE_EXCLUDED(n))) {
    const source = readFileSync(path.join(updateDir, file), 'utf8').replace(/from '(\.\/[\w-]+)'/g, "from '$1.ts'");
    writeFileSync(path.join(serverDir, file), source);
  }
  copyFileSync(path.join(updateDir, 'version.mjs'), path.join(serverDir, 'version.mjs'));
}

function stageRelease(stage, { repo, installerDir, version, broken }) {
  for (const d of ['node/bin', 'server', 'launcher', 'helper']) mkdirSync(path.join(stage, d), { recursive: true });
  symlinkSync(process.execPath, path.join(stage, 'node/bin/node'));
  writeFileSync(path.join(stage, 'server/package.json'), '{"type":"module"}\n');
  writeFileSync(path.join(stage, 'server/server.js'), standInServerSource(broken));
  copyUpdateSources(repo, path.join(stage, 'server'));
  copyFileSync(path.join(installerDir, 'launcher.sh'), path.join(stage, 'launcher/launcher.sh'));
  writeFileSync(path.join(stage, 'launcher/AppIcon.icns'), 'icns');
  writeFileSync(path.join(stage, 'helper/meeting-noter-audio-helper'), '#!/bin/sh\n# fake helper\n', { mode: 0o755 });
  copyFileSync(path.join(installerDir, 'uninstall.sh'), path.join(stage, 'uninstall.sh'));
  writeFileSync(path.join(stage, 'VERSION'), `${version}\n`);
  writeFileSync(path.join(stage, 'ARCH'), 'arm64\n');
}

export function createReleaseBuilder({ tmp, repo, installerDir, run }) {
  return async function makeRelease(version, { broken = false } = {}) {
    const dir = path.join(tmp, 'releases', version);
    const stage = path.join(dir, 'stage', 'meeting-noter');
    stageRelease(stage, { repo, installerDir, version, broken });
    const tar = await run('/usr/bin/tar', ['-czf', path.join(dir, ASSET), '-C', path.dirname(stage), 'meeting-noter'], { ...process.env, COPYFILE_DISABLE: '1' });
    if (tar.code !== 0) throw new Error(tar.out);
    const sum = createHash('sha256').update(readFileSync(path.join(dir, ASSET))).digest('hex');
    writeFileSync(path.join(dir, `${ASSET}.sha256`), `${sum}  ${ASSET}\n`);
    copyFileSync(path.join(installerDir, 'install.sh'), path.join(dir, 'install.sh'));
    return { version, dir, sum, cut: false };
  };
}
