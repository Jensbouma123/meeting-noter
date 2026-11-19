// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-eval-'));
const audio = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
const hasAudio = fs.existsSync(path.join(audio, 'ami-EN2002b-5min.wav'));

const call = (route: typeof import('./route'), method: 'GET' | 'POST', query: string, body?: unknown) =>
  route[method](
    new Request(`http://localhost:3000/api/dev/echo-eval?${query}`, {
      method,
      headers: { host: 'localhost:3000', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

describe.skipIf(!hasAudio)('echo-eval route', () => {
  it('plans, accepts results, resumes and writes the report with the recorded backend', async () => {
    vi.stubEnv('ECHO_EVAL_OUT', out);
    vi.stubEnv('ECHO_EVAL_AUDIO', audio);
    const route = await import('./route');
    const plan = (await (await call(route, 'GET', 'op=plan&limit=2')).json()) as {
      cases: { id: string; kind: string; split: string; systemUtt: string; micUtt: string | null; bleed: null }[];
      done: string[];
    };
    expect(plan.cases).toHaveLength(2);
    expect(plan.done).toEqual([]);
    const bytes = await (await call(route, 'GET', `op=audio&id=${plan.cases[0].systemUtt}`)).arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(16_000);
    await call(route, 'POST', 'op=begin', { backend: 'fake', userAgent: 'test-ua', startedAt: 'now' });
    const first = plan.cases[0];
    await call(route, 'POST', 'op=result', {
      ...first,
      micAsr: [],
      systemAsr: [],
      micSurvivors: [],
      micDropped: [],
    });
    const again = (await (await call(route, 'GET', 'op=plan&limit=2')).json()) as { done: string[] };
    expect(again.done).toEqual([first.id]);
    await call(route, 'POST', 'op=finish', {});
    const status = (await (await call(route, 'GET', 'op=status&limit=2')).json()) as { finished: boolean; total: number };
    expect(status).toMatchObject({ finished: true, total: 2 });
    expect(fs.readFileSync(path.join(out, 'report.md'), 'utf8')).toContain('backend fake');
  });

  it('refuses in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const route = await import('./route');
    expect((await call(route, 'GET', 'op=status')).status).toBe(404);
  });
});
