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

describe.skipIf(!hasAudio)('echo-eval route shards', () => {
  it('splits meetings across shard tabs with their own files and markers, then merges them', async () => {
    vi.stubEnv('ECHO_EVAL_OUT', out);
    vi.stubEnv('ECHO_EVAL_AUDIO', audio);
    fs.rmSync(path.join(out, 'meetings.jsonl'), { force: true });
    const route = await import('./route');
    const q = (i: number) => `set=meetings&limit=3&shard=${i}&shards=2`;
    const full = (await (await call(route, 'GET', 'op=plan&set=meetings&limit=3')).json()) as { cases: { id: string }[] };
    const parts = await Promise.all(
      [0, 1].map(async (i) => ((await (await call(route, 'GET', `op=plan&${q(i)}`)).json()) as { cases: { id: string }[] }).cases),
    );
    expect(parts.map((p) => p.map((c) => c.id))).toEqual([[full.cases[0].id, full.cases[2].id], [full.cases[1].id]]);
    for (const [i, cases] of parts.entries()) {
      await call(route, 'POST', `op=begin&${q(i)}`, { backend: 'fake', userAgent: 'ua', startedAt: 'now' });
      for (const c of cases) await call(route, 'POST', `op=result&${q(i)}`, { id: c.id, split: 'dev', segments: [] });
    }
    expect(fs.readFileSync(path.join(out, 'meetings.shard1.jsonl'), 'utf8').trim().split('\n')).toHaveLength(1);
    await call(route, 'POST', `op=finish&${q(0)}`, {});
    await call(route, 'POST', `op=fail&${q(1)}`, { error: 'model load' });
    const s0 = (await (await call(route, 'GET', `op=status&${q(0)}`)).json()) as { done: number; finished: boolean };
    const s1 = (await (await call(route, 'GET', `op=status&${q(1)}`)).json()) as { error: string | null };
    expect(s0).toMatchObject({ done: 2, finished: true });
    expect(s1.error).toBe('model load');
    expect(fs.existsSync(path.join(out, 'meetings.jsonl'))).toBe(false);
    await call(route, 'POST', 'op=merge&set=meetings&shards=2', {});
    const merged = (await (await call(route, 'GET', 'op=plan&set=meetings&limit=3')).json()) as { done: string[] };
    expect(merged.done.sort()).toEqual(full.cases.map((c) => c.id).sort());
    expect(fs.existsSync(path.join(out, 'finished.meetings.json'))).toBe(true);
  });
});
