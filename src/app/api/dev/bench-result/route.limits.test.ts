import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POST } from './route';
import { env, filesIn, postJson, registerBenchTempDirs } from './testSupport';

const tmpDir = registerBenchTempDirs();

describe('POST body limits', () => {
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
      { highWaterMark: 0 },
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
    expect(pulled).toBeLessThan(10);
    expect(filesIn(dir)).toHaveLength(0);
  });

  it('rejects a body that is not a JSON object, and one that is absurd', async () => {
    const dir = tmpDir();
    env.ASR_BENCH_RESULT_DIR = dir;
    expect((await postJson('not json')).status).toBe(400);
    expect((await postJson('[1,2,3]')).status).toBe(400);
    expect((await postJson('"a string"')).status).toBe(400);
    const huge = await postJson({ phase: 'done', text: 'x'.repeat(1_000_001) });
    expect(huge.status).toBe(413);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
