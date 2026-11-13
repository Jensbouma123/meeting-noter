import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POST } from './route';
import { SAFARI_UA, env, filesIn, postJson, registerBenchTempDirs } from './testSupport';

const tmpDir = registerBenchTempDirs();

describe('POST', () => {
  it('writes one file per run and reports where it went', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const payload = { phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA, meanRtf: 0.137, results: [] };
    const res = await postJson(payload);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; file: string; path?: string };
    expect(body.ok).toBe(true);
    expect(body.path).toBeUndefined();
    const files = fs.readdirSync(dir);
    expect(files).toHaveLength(1);
    expect(body.file).toBe(files[0]);
    expect(files[0]).toMatch(/^webgpu-fp16-safari-.*\.json$/);
    const written = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
    expect(written).toMatchObject(payload);
    expect(typeof written.receivedAt).toBe('string');
  });

  it('refuses a cross-origin POST and writes nothing', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await POST(
      new Request('http://localhost:3000/api/dev/bench-result', {
        method: 'POST',
        headers: { host: 'localhost:3000', 'content-type': 'text/plain', origin: 'https://evil.example' },
        body: JSON.stringify({ variant: 'x' }),
      }),
    );
    expect(res.status).toBe(403);
    expect(filesIn(dir)).toHaveLength(0);
  });

  it('refuses a DNS-rebinding POST (foreign Host, no Origin) and writes nothing', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await POST(
      new Request('http://evil.example:3000/api/dev/bench-result', {
        method: 'POST',
        headers: { host: 'evil.example:3000', 'content-type': 'application/json' },
        body: JSON.stringify({ variant: 'x' }),
      }),
    );
    expect(res.status).toBe(403);
    expect(filesIn(dir)).toHaveLength(0);
  });

  it('refuses a POST with no Host header and writes nothing', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await POST(
      new Request('http://localhost:3000/api/dev/bench-result', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variant: 'x' }),
      }),
    );
    expect(res.status).toBe(403);
    expect(filesIn(dir)).toHaveLength(0);
  });

  it('keeps a retried run instead of overwriting the previous one', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    await postJson({ phase: 'error', variant: 'wasm-int8', userAgent: SAFARI_UA, error: 'first attempt' });
    await postJson({ phase: 'done', variant: 'wasm-int8', userAgent: SAFARI_UA, error: undefined });
    expect(fs.readdirSync(dir)).toHaveLength(2);
  });

  it('creates the bench directory on demand', async () => {
    const dir = path.join(tmpDir(), 'bench-results');
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await postJson({ phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA });
    expect(res.status).toBe(200);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('404s in production without writing anything', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    env.NODE_ENV = 'production';
    const res = await postJson({ phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA });
    expect(res.status).toBe(404);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
