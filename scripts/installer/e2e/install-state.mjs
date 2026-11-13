import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { USER_FILES } from './constants.mjs';

export function createInstallState(root) {
  const read = (file) => readFileSync(path.join(root, file), 'utf8');

  function userFilesIntact() {
    const bad = Object.entries(USER_FILES).filter(([f, body]) => !existsSync(path.join(root, f)) || read(f) !== body);
    return { ok: bad.length === 0, bad: bad.map(([f]) => f).join(', ') };
  }

  function noLeftovers() {
    const left = ['app.old', 'app.new', 'app.failed'].filter((d) => existsSync(path.join(root, d)));
    return { ok: left.length === 0, left: left.join(', ') };
  }

  return { read, userFilesIntact, noLeftovers };
}
