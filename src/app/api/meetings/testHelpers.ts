import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';

export const env = process.env as Record<string, string | undefined>;

export const LOCAL = { host: 'localhost:3000' };

export const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

export function useTempDataDir(prefix: string) {
  const data = { dir: '' };
  const previousDir = env.MEETING_NOTER_DATA_DIR;
  beforeEach(() => {
    data.dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    env.MEETING_NOTER_DATA_DIR = data.dir;
  });
  afterEach(() => {
    if (previousDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
    else env.MEETING_NOTER_DATA_DIR = previousDir;
    fs.rmSync(data.dir, { recursive: true, force: true });
  });
  return data;
}

export const meetingsUrl = (p: string) => `http://localhost:3000/api/meetings${p}`;

export const localRequest = (p: string, init: RequestInit = {}) =>
  new Request(meetingsUrl(p), { ...init, headers: { ...LOCAL, ...(init.headers as Record<string, string>) } });

export const jsonRequest = (method: string, p: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(meetingsUrl(p), {
    method,
    headers: { ...LOCAL, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

export const rawRequest = (method: string, p: string, headers: Record<string, string>, body?: string) =>
  new Request(meetingsUrl(p), { method, headers, body });

export const dataDirFiles = (dir: string) =>
  fs.readdirSync(dir).filter((f) => f !== 'meetings.db' && !f.startsWith('meetings.db-'));
