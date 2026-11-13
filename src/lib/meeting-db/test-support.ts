import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { MeetingsDb } from './db';

export function registerTempDirs() {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });
  const tmpDir = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-db-'));
    dirs.push(dir);
    return dir;
  };
  const openDb = (): MeetingsDb => new MeetingsDb(path.join(tmpDir(), 'meetings.db'));
  return { tmpDir, openDb };
}
