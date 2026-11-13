import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { CliRunner } from './types';

export function findCli(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const extra = ['/opt/homebrew/bin', '/usr/local/bin', `${env.HOME ?? ''}/.local/bin`, `${env.HOME ?? ''}/.claude/local`];
  const dirs = [...(env.PATH ?? '').split(path.delimiter), ...extra].filter(Boolean);
  for (const dir of dirs) {
    const file = path.join(dir, name);
    try {
      fs.accessSync(file, fs.constants.X_OK);
      if (fs.statSync(file).isFile()) return file;
    } catch {
      continue;
    }
  }
  return null;
}

export const runCli: CliRunner = (bin, args) =>
  new Promise((resolve) => {
    execFile(bin, args, { timeout: 20_000 }, (err, stdout) => resolve({ ok: !err, stdout: String(stdout ?? '') }));
  });
