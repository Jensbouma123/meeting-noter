import { execFileSync } from 'node:child_process';
import { mkdirSync, symlinkSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import path from 'node:path';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const accepts = (port: number) =>
  new Promise<boolean>((r) => {
    const c = createConnection(port, '127.0.0.1').once('connect', () => { c.destroy(); r(true); }).once('error', () => r(false));
  });

export async function startNodeListener(link: string, cwd: string) {
  const free = createServer();
  await new Promise<void>((r) => free.listen(0, '127.0.0.1', r));
  const port = (free.address() as { port: number }).port;
  await new Promise((r) => free.close(r));
  mkdirSync(path.dirname(link), { recursive: true });
  symlinkSync(process.execPath, link);
  const script = `require('net').createServer().listen(${port}, '127.0.0.1')`;
  const pid = Number(execFileSync('/bin/sh', ['-c', '"$0" -e "$1" </dev/null >/dev/null 2>&1 & echo $!', link, script], { cwd, encoding: 'utf8' }).trim());
  for (let i = 0; i < 100; i++) {
    if (await accepts(port)) break;
    await delay(50);
  }
  return { pid, port };
}

export const isAlive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

export async function waitUntilGone(pid: number) {
  for (let i = 0; i < 100 && isAlive(pid); i++) await delay(50);
}

export function killIfStillRunning(pid: number) {
  try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
}
