// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { writeWav16kMono } from '../../../../../scripts/echo-eval/lib/wav-io';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-eval-ext-out-'));
const ext = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-eval-ext-in-'));
const SAMPLES = 3200;
writeWav16kMono(path.join(ext, 'audio16k.wav'), new Float32Array(SAMPLES).fill(0.25));
fs.writeFileSync(
  path.join(ext, 'reference.json'),
  JSON.stringify({ id: 'synthetic', turns: [{ start: 0, end: 0.1, spk: 'A', text: 'hi' }, { start: 0.1, end: 0.2, spk: 'B' }] }),
);

const call = (route: typeof import('./route'), method: 'GET' | 'POST', query: string, body?: unknown) =>
  route[method](
    new Request(`http://localhost:3000/api/dev/echo-eval?${query}`, {
      method,
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

afterAll(() => {
  fs.rmSync(out, { recursive: true, force: true });
  fs.rmSync(ext, { recursive: true, force: true });
});

describe('echo-eval route, set=external', () => {
  it('plans the folder, serves its pcm, records results and writes the external report', async () => {
    vi.stubEnv('ECHO_EVAL_OUT', out);
    vi.stubEnv('ECHO_EVAL_EXTERNAL', ext);
    const route = await import('./route');
    const plan = (await (await call(route, 'GET', 'op=plan&set=external')).json()) as {
      cases: { id: string; split: 'heldout' }[];
      utterances: number;
      done: string[];
    };
    expect(plan.cases.map((c) => c.id)).toEqual(['synthetic-ext-system', 'synthetic-ext-bleed']);
    expect(plan).toMatchObject({ utterances: 0, done: [] });
    const pcm = new Int16Array(await (await call(route, 'GET', 'op=wav&set=external')).arrayBuffer());
    expect(pcm.byteLength).toBe(2 * SAMPLES);
    expect(pcm[0]).toBe(Math.round(0.25 * 32767));
    await call(route, 'POST', 'op=begin&set=external', { backend: 'fake', userAgent: 'test-ua', startedAt: 'now' });
    for (const c of plan.cases) {
      expect((await call(route, 'POST', 'op=result&set=external', { id: c.id, split: c.split, segments: [] })).status).toBe(200);
    }
    const again = (await (await call(route, 'GET', 'op=plan&set=external')).json()) as { done: string[] };
    expect(again.done).toHaveLength(2);
    expect((await call(route, 'POST', 'op=finish&set=external', {})).status).toBe(200);
    expect(fs.readFileSync(path.join(out, 'external-report.md'), 'utf8')).toContain('2 meetings');
    expect(JSON.parse(fs.readFileSync(path.join(out, 'finished.external.json'), 'utf8'))).toMatchObject({ ok: true });
    expect(fs.existsSync(path.join(out, 'external.jsonl'))).toBe(true);
  });
});
