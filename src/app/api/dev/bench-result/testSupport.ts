import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { POST } from './route';

export const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15';
export const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

export const env = process.env as Record<string, string | undefined>;

export function registerBenchTempDirs() {
  const dirs: string[] = [];
  const previous = { node: env.NODE_ENV, dir: env.ASR_BENCH_RESULT_DIR };
  afterEach(() => {
    if (previous.node === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previous.node;
    if (previous.dir === undefined) delete env.ASR_BENCH_RESULT_DIR;
    else env.ASR_BENCH_RESULT_DIR = previous.dir;
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });
  return (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-result-'));
    dirs.push(dir);
    return dir;
  };
}

export const postJson = (body: unknown) =>
  POST(
    new Request('http://localhost:3000/api/dev/bench-result', {
      method: 'POST',
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

export const filesIn = (dir: string): string[] => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);
