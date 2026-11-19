import type { CaseResult } from '../../../../scripts/echo-eval/types/case-result';
import type { RunMeta } from '../../../../scripts/echo-eval/types/run-meta';
import type { EvalPlan } from './types';

const ENDPOINT = '/api/dev/echo-eval';

async function send(op: string, body: unknown, fake: boolean): Promise<void> {
  const res = await fetch(`${ENDPOINT}?op=${op}${fake ? '&fake=1' : ''}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`echo-eval ${op} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function fetchPlan(limit: number | null, fake = false): Promise<EvalPlan> {
  const res = await fetch(`${ENDPOINT}?op=plan${limit ? `&limit=${limit}` : ''}${fake ? '&fake=1' : ''}`);
  if (!res.ok) throw new Error(`echo-eval plan ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as EvalPlan;
}

export async function fetchAudio(id: string): Promise<Float32Array> {
  const res = await fetch(`${ENDPOINT}?op=audio&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`echo-eval audio ${id} ${res.status}`);
  return new Float32Array(await res.arrayBuffer());
}

export const postBegin = (meta: RunMeta, fake = false) => send('begin', meta, fake);
export const postResult = (result: CaseResult, fake = false) => send('result', result, fake);
export const postFinish = (fake = false) => send('finish', {}, fake);
export const postFail = (error: string, fake = false) => send('fail', { error }, fake);
