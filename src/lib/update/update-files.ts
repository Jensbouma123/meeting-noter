import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { IDLE_STATUS } from './constants';
import { deriveStatus } from './derive-status';
import { readTrimmedFile } from './read-trimmed-file';
import type { UpdateExit, UpdateMeta, UpdateStatus } from './types';

export const updateFiles = (stateDir: string) => ({
  meta: path.join(stateDir, 'update.json'),
  log: path.join(stateDir, 'update.log'),
  exit: path.join(stateDir, 'update.exit'),
});

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readMeta(file: string): UpdateMeta | null {
  try {
    const m = JSON.parse(readFileSync(file, 'utf8'));
    return m && typeof m.pid === 'number' ? (m as UpdateMeta) : null;
  } catch {
    return null;
  }
}

function readExit(file: string): UpdateExit | null {
  const code = readTrimmedFile(file);
  if (code === null || !/^\d+$/.test(code)) return null;
  return { code: Number(code), at: statSync(file).mtime.toISOString() };
}

export function readUpdateStatus(stateDir: string | null): UpdateStatus {
  if (!stateDir) return IDLE_STATUS;
  const f = updateFiles(stateDir);
  const meta = readMeta(f.meta);
  if (!meta) return IDLE_STATUS;
  const exit = readExit(f.exit);
  return deriveStatus(meta, readTrimmedFile(f.log) ?? '', exit, exit === null && isPidAlive(meta.pid));
}

export function updateRunning(stateDir: string | null): boolean {
  return readUpdateStatus(stateDir).state === 'running';
}
