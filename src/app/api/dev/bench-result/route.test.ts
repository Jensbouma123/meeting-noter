import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { POST } from './route';
import {
  benchResultsDir,
  browserFromUserAgent,
  fileTimestamp,
  resultFileName,
  slug,
  variantFromPayload,
} from './helpers';

/**
 * The dev-only sink `/dev/asr-bench` posts to. Its job is narrow and has to
 * stay narrow: 404 in production, one sanitised file per POST inside the bench
 * directory, and never throw on a body it does not understand.
 */

const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const dirs: string[] = [];
/** `next` types `NODE_ENV` as read-only, so go through a mutable view. */
const env = process.env as Record<string, string | undefined>;
const prevEnv = { node: env.NODE_ENV, dir: env.ASR_BENCH_RESULT_DIR };

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-result-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  if (prevEnv.node === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = prevEnv.node;
  if (prevEnv.dir === undefined) delete env.ASR_BENCH_RESULT_DIR;
  else env.ASR_BENCH_RESULT_DIR = prevEnv.dir;
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** Node's Request sets no Host header, so every test call names the local one a browser would send. */
const post = (body: unknown) =>
  POST(
    new Request('http://localhost:3000/api/dev/bench-result', {
      method: 'POST',
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

describe('slug', () => {
  it('keeps only filename-safe characters, bounded and lowercase', () => {
    expect(slug('webgpu-fp16')).toBe('webgpu-fp16');
    expect(slug('  WebGPU/FP16  ')).toBe('webgpu-fp16');
    expect(slug('../../etc/passwd')).toBe('etc-passwd');
    expect(slug('..')).toBe('unknown');
    expect(slug(null)).toBe('unknown');
    expect(slug('x'.repeat(80)).length).toBe(48);
  });
});

describe('browserFromUserAgent', () => {
  it('does not call Chrome Safari, which is the whole point of checking order', () => {
    expect(browserFromUserAgent(SAFARI_UA)).toBe('safari');
    expect(browserFromUserAgent(CHROME_UA)).toBe('chrome');
    expect(browserFromUserAgent('Mozilla/5.0 … Edg/143.0')).toBe('edge');
    expect(browserFromUserAgent('Mozilla/5.0 … FxiOS/143.0')).toBe('firefox');
    expect(browserFromUserAgent('Mozilla/5.0 … CriOS/143.0')).toBe('chrome');
    expect(browserFromUserAgent('')).toBe('unknown');
    expect(browserFromUserAgent(undefined)).toBe('unknown');
  });
});

describe('variant + file naming', () => {
  it('prefers the variant the page sent, and falls back to backend-encoder', () => {
    expect(variantFromPayload({ variant: 'wasm-int8' })).toBe('wasm-int8');
    expect(variantFromPayload({ backend: 'webgpu', encoderQuant: 'q4f16' })).toBe('webgpu-q4f16');
    expect(variantFromPayload({ backend: 'wasm' })).toBe('wasm');
    expect(variantFromPayload({})).toBe('unknown');
  });

  it('builds <variant>-<browser>-<timestamp>.json with a sortable timestamp', () => {
    const name = resultFileName({ variant: 'webgpu-fp16', userAgent: SAFARI_UA }, new Date('2026-09-28T13:45:01.5Z'));
    expect(name).toBe('webgpu-fp16-safari-2026-09-28T13-45-01-500Z.json');
    expect(fileTimestamp(new Date('2026-09-28T13:45:01.5Z'))).toBe('2026-09-28T13-45-01-500Z');
    // Lexicographic order has to match chronological order for "newest wins".
    expect(fileTimestamp(new Date('2026-09-28T13:45:02Z')) > fileTimestamp(new Date('2026-09-28T13:45:01Z'))).toBe(true);
  });
});

describe('POST', () => {
  it('writes one file per run and reports where it went', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const payload = { phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA, meanRtf: 0.137, results: [] };
    const res = await post(payload);
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
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toHaveLength(0);
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
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toHaveLength(0);
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
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toHaveLength(0);
  });

  it('rejects an oversized declared content-length before reading the body', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await POST(
      new Request('http://localhost:3000/api/dev/bench-result', {
        method: 'POST',
        headers: { host: 'localhost:3000', 'content-type': 'application/json', 'content-length': '5000000' },
        body: '{}',
      }),
    );
    expect(res.status).toBe(413);
  });

  it('stops reading a chunked oversized body once the cap is passed, answers 413', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    const encoder = new TextEncoder();
    const chunk = encoder.encode('x'.repeat(300_000));
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulled += 1;
          if (pulled > 10) controller.close();
          else controller.enqueue(chunk);
        },
      },
      { highWaterMark: 0 }, // pull only on read, so `pulled` counts what the server read
    );
    const res = await POST(
      new Request('http://localhost:3000/api/dev/bench-result', {
        method: 'POST',
        headers: { host: 'localhost:3000', 'content-type': 'application/json' },
        body: stream,
        duplex: 'half',
      } as RequestInit),
    );
    expect(res.status).toBe(413);
    // 300 kB chunks pass the 1 MB cap on the fourth read: the other six must never be pulled.
    expect(pulled).toBeLessThan(10);
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toHaveLength(0);
  });

  it('keeps a retried run instead of overwriting the previous one', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    await post({ phase: 'error', variant: 'wasm-int8', userAgent: SAFARI_UA, error: 'first attempt' });
    await post({ phase: 'done', variant: 'wasm-int8', userAgent: SAFARI_UA, error: undefined });
    expect(fs.readdirSync(dir)).toHaveLength(2);
  });

  it('creates the bench directory on demand', async () => {
    const dir = path.join(tmpDir(), 'bench-results');
    env.ASR_BENCH_RESULT_DIR = dir;
    const res = await post({ phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA });
    expect(res.status).toBe(200);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('404s in production without writing anything', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    env.NODE_ENV = 'production';
    const res = await post({ phase: 'done', variant: 'webgpu-fp16', userAgent: SAFARI_UA });
    expect(res.status).toBe(404);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('rejects a body that is not a JSON object, and one that is absurd', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    expect((await post('not json')).status).toBe(400);
    expect((await post('[1,2,3]')).status).toBe(400);
    expect((await post('"a string"')).status).toBe(400);
    const huge = await post({ phase: 'done', text: 'x'.repeat(1_000_001) });
    expect(huge.status).toBe(413);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('benchResultsDir', () => {
  it('defaults to test-audio/bench-results next to the repo', () => {
    delete env.ASR_BENCH_RESULT_DIR;
    expect(benchResultsDir()).toMatch(/test-audio[/\\]bench-results$/);
  });

  it('honours the override both the route and the scorer read', () => {
    env.ASR_BENCH_RESULT_DIR = '/tmp/x';
    expect(benchResultsDir()).toBe('/tmp/x');
  });
});
