import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { INSTALL_URL } from './constants';
import type { InstallInfo, UpdateMeta, UpdateStatus } from './types';
import { readUpdateStatus, updateFiles } from './update-files';
import { UPDATE_SCRIPTS } from './update-scripts';

function updaterEnv(info: InstallInfo): NodeJS.ProcessEnv {
  if (info.kind !== 'installer') return { ...process.env };
  const passThrough = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('MEETING_NOTER_')));
  return {
    NODE_ENV: process.env.NODE_ENV,
    HOME: process.env.HOME ?? '',
    USER: process.env.USER ?? '',
    LANG: process.env.LANG ?? 'nl_NL.UTF-8',
    TMPDIR: process.env.TMPDIR ?? '/tmp',
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    ...passThrough,
  };
}

export function startUpdate(info: InstallInfo, toVersion: string): UpdateStatus {
  const script = UPDATE_SCRIPTS[info.kind];
  if (!script || !info.stateDir) throw new Error(`cannot update a ${info.kind} install`);
  const f = updateFiles(info.stateDir);
  mkdirSync(info.stateDir, { recursive: true });
  for (const file of [f.meta, f.exit, `${f.exit}.tmp`]) rmSync(file, { force: true });
  const fd = openSync(f.log, 'w');
  const env = updaterEnv(info);
  let pid: number | undefined;
  try {
    const child = spawn('/bin/bash', ['-c', script], {
      cwd: info.appDir,
      detached: true,
      stdio: ['ignore', fd, fd],
      env: {
        ...env,
        MN_EXIT: f.exit,
        MN_NODE: process.execPath,
        MN_INSTALL_URL: process.env.MEETING_NOTER_INSTALL_URL || INSTALL_URL,
      },
    });
    child.unref();
    pid = child.pid;
  } finally {
    closeSync(fd);
  }
  if (!pid) throw new Error('updater did not start');
  const meta: UpdateMeta = { kind: info.kind, pid, fromVersion: info.current, toVersion, startedAt: new Date().toISOString() };
  writeFileSync(f.meta, JSON.stringify(meta));
  return readUpdateStatus(info.stateDir);
}
