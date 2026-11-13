import { spawn } from 'node:child_process';
import { closeSync, openSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function createCommandRunner(tmp) {
  let runs = 0;
  return function runWithoutBlocking(cmd, args, env) {
    const log = path.join(tmp, `run-${++runs}.log`);
    const fd = openSync(log, 'w');
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { env, stdio: ['ignore', fd, fd] });
      closeSync(fd);
      child.on('exit', (code) => resolve({ code, out: readFileSync(log, 'utf8') }));
    });
  };
}
