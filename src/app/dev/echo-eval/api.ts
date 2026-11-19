import type { CaseResult } from '../../../../scripts/echo-eval/types/case-result';
import type { RunMeta } from '../../../../scripts/echo-eval/types/run-meta';
import type { EvalPlan } from './types';

const ENDPOINT = '/api/dev/echo-eval';

async function send(op: string, body: unknown): Promise<void> {
  const res = await fetch(`${ENDPOINT}?op=${op}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`echo-eval ${op} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function fetchPlan(limit: number | null): Promise<EvalPlan> {
  const res = await fetch(`${ENDPOINT}?op=plan${limit ? `&limit=${limit}` : ''}`);
  if (!res.ok) throw new Error(`echo-eval plan ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as EvalPlan;
}

export async function fetchAudio(id: string): Promise<Float32Array> {
  const res = await fetch(`${ENDPOINT}?op=audio&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`echo-eval audio ${id} ${res.status}`);
  return new Float32Array(await res.arrayBuffer());
}

export const postBegin = (meta: RunMeta) => send('begin', meta);
export const postResult = (result: CaseResult) => send('result', result);
export const postFinish = () => send('finish', {});
export const postFail = (error: string) => send('fail', { error });
