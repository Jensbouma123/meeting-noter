import type { CaseResult } from '../../../../scripts/echo-eval/types/case-result';
import type { MeetingResult } from '../../../../scripts/echo-eval/types/meeting-result';
import type { RunMeta } from '../../../../scripts/echo-eval/types/run-meta';
import type { EvalPlan } from './types';

const ENDPOINT = '/api/dev/echo-eval';

const flags = (fake: boolean, meetings: boolean): string => `${fake ? '&fake=1' : ''}${meetings ? '&set=meetings' : ''}`;

async function send(op: string, body: unknown, fake: boolean, meetings: boolean): Promise<void> {
  const res = await fetch(`${ENDPOINT}?op=${op}${flags(fake, meetings)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`echo-eval ${op} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function fetchPlan(limit: number | null, fake = false, meetings = false): Promise<EvalPlan> {
  const res = await fetch(`${ENDPOINT}?op=plan${limit ? `&limit=${limit}` : ''}${flags(fake, meetings)}`);
  if (!res.ok) throw new Error(`echo-eval plan ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as EvalPlan;
}

export async function fetchAudio(id: string): Promise<Float32Array> {
  const res = await fetch(`${ENDPOINT}?op=audio&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`echo-eval audio ${id} ${res.status}`);
  return new Float32Array(await res.arrayBuffer());
}

export const postBegin = (meta: RunMeta, fake = false, meetings = false) => send('begin', meta, fake, meetings);
export const postResult = (result: CaseResult | MeetingResult, fake = false, meetings = false) => send('result', result, fake, meetings);
export const postFinish = (fake = false, meetings = false) => send('finish', {}, fake, meetings);
export const postFail = (error: string, fake = false, meetings = false) => send('fail', { error }, fake, meetings);
