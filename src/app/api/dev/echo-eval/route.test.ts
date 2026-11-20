// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-eval-'));
const audio = process.env.ECHO_EVAL_AUDIO ?? path.resolve('..', 'test-audio');
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

  it('ignores stale rows outside the current plan and isolates fake from real runs', async () => {
    vi.stubEnv('ECHO_EVAL_OUT', out);
    vi.stubEnv('ECHO_EVAL_AUDIO', audio);
    for (const f of ['results.jsonl', 'results.fake.jsonl', 'finished.json', 'finished.fake.json']) {
      fs.rmSync(path.join(out, f), { force: true });
    }
    const route = await import('./route');
    const plan = (await (await call(route, 'GET', 'op=plan&limit=2')).json()) as {
      cases: { id: string; kind: string; split: string; systemUtt: string; micUtt: string | null; bleed: null }[];
    };
    const [c0, c1] = plan.cases;
    const staleRows = Array.from({ length: 30 }, (_, i) =>
      JSON.stringify({ ...c0, id: `stale-case-${i}`, micAsr: [], systemAsr: [], micSurvivors: [], micDropped: [] }),
    );
    staleRows.push(JSON.stringify({ ...c0, micAsr: [], systemAsr: [], micSurvivors: [], micDropped: [] }));
    staleRows.push(JSON.stringify({ ...c0, micAsr: [], systemAsr: [], micSurvivors: [], micDropped: [] }));
    fs.writeFileSync(path.join(out, 'results.jsonl'), `${staleRows.join('\n')}\n`);

    const realPlan = (await (await call(route, 'GET', 'op=plan&limit=2')).json()) as { done: string[] };
    expect(realPlan.done).toEqual([c0.id]);
    const realStatus = (await (await call(route, 'GET', 'op=status&limit=2')).json()) as {
      done: number;
      total: number;
      finished: boolean;
    };
    expect(realStatus).toMatchObject({ done: 1, total: 2, finished: false });

    const fakeStatusBefore = (await (await call(route, 'GET', 'op=status&limit=2&fake=1')).json()) as {
      done: number;
      total: number;
      finished: boolean;
    };
    expect(fakeStatusBefore).toMatchObject({ done: 0, total: 2, finished: false });

    await call(route, 'POST', 'op=begin&fake=1', { backend: 'fake', userAgent: 'test-ua', startedAt: 'now' });
    for (const c of [c0, c1]) {
      await call(route, 'POST', 'op=result&fake=1', {
        ...c,
        micAsr: [],
        systemAsr: [],
        micSurvivors: [],
        micDropped: [],
      });
    }
    await call(route, 'POST', 'op=finish&fake=1', {});

    const fakeStatusAfter = (await (await call(route, 'GET', 'op=status&limit=2&fake=1')).json()) as {
      done: number;
      total: number;
      finished: boolean;
    };
    expect(fakeStatusAfter).toMatchObject({ done: 2, total: 2, finished: true });
    expect(
      (await (await call(route, 'GET', 'op=status&limit=2')).json()) as { done: number; finished: boolean },
    ).toMatchObject({ done: 1, finished: false });
  });

  it('plans, records and reports meetings in their own files', async () => {
    vi.stubEnv('ECHO_EVAL_OUT', out);
    vi.stubEnv('ECHO_EVAL_AUDIO', audio);
    const route = await import('./route');
    const plan = (await (await call(route, 'GET', 'op=plan&set=meetings&limit=2')).json()) as {
      cases: { id: string; turns: unknown[] }[];
      done: string[];
    };
    expect(plan.cases).toHaveLength(2);
    expect(plan.cases[0].turns.length).toBeGreaterThan(10);
    await call(route, 'POST', 'op=begin&set=meetings', { backend: 'fake', userAgent: 'ua', startedAt: 'now' });
    await call(route, 'POST', 'op=result&set=meetings', { id: plan.cases[0].id, split: 'dev', segments: [] });
    const again = (await (await call(route, 'GET', 'op=plan&set=meetings&limit=2')).json()) as { done: string[] };
    expect(again.done).toEqual([plan.cases[0].id]);
    await call(route, 'POST', 'op=finish&set=meetings', {});
    expect(fs.existsSync(path.join(out, 'meetings-report.md'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'finished.meetings.json'))).toBe(true);
  });

  it('refuses in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const route = await import('./route');
    expect((await call(route, 'GET', 'op=status')).status).toBe(404);
  });
});
