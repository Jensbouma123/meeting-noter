import { shardQuery } from '../../../../scripts/echo-eval/lib/shard';
import { pcm16ToFloat } from '../../../../scripts/echo-eval/lib/external-render';
import type { CaseResult } from '../../../../scripts/echo-eval/types/case-result';
import type { MeetingResult } from '../../../../scripts/echo-eval/types/meeting-result';
import type { EvalSet } from '../../../../scripts/echo-eval/types/eval-set';
import type { RunMeta } from '../../../../scripts/echo-eval/types/run-meta';
import type { Shard } from '../../../../scripts/echo-eval/types/shard';
import type { EvalPlan } from './types';

const ENDPOINT = '/api/dev/echo-eval';

const flags = (fake: boolean, set: EvalSet, shard: Shard | null): string =>
  `${fake ? '&fake=1' : ''}${set === 'cases' ? '' : `&set=${set}`}${shardQuery(shard)}`;

async function send(op: string, body: unknown, fake: boolean, set: EvalSet, shard: Shard | null): Promise<void> {
  const res = await fetch(`${ENDPOINT}?op=${op}${flags(fake, set, shard)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`echo-eval ${op} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function fetchPlan(limit: number | null, fake = false, set: EvalSet = 'cases', shard: Shard | null = null): Promise<EvalPlan> {
  const res = await fetch(`${ENDPOINT}?op=plan${limit ? `&limit=${limit}` : ''}${flags(fake, set, shard)}`);
  if (!res.ok) throw new Error(`echo-eval plan ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as EvalPlan;
}

export async function fetchAudio(id: string): Promise<Float32Array> {
  const res = await fetch(`${ENDPOINT}?op=audio&id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`echo-eval audio ${id} ${res.status}`);
  return new Float32Array(await res.arrayBuffer());
}

export async function fetchExternalPcm(): Promise<Float32Array> {
  const res = await fetch(`${ENDPOINT}?op=wav&set=external`);
  if (!res.ok) throw new Error(`echo-eval wav ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return pcm16ToFloat(await res.arrayBuffer());
}

export const postBegin = (meta: RunMeta, fake = false, set: EvalSet = 'cases', shard: Shard | null = null) =>
  send('begin', meta, fake, set, shard);
export const postResult = (result: CaseResult | MeetingResult, fake = false, set: EvalSet = 'cases', shard: Shard | null = null) =>
  send('result', result, fake, set, shard);
export const postFinish = (fake = false, set: EvalSet = 'cases', shard: Shard | null = null) => send('finish', {}, fake, set, shard);
export const postFail = (error: string, fake = false, set: EvalSet = 'cases', shard: Shard | null = null) =>
  send('fail', { error }, fake, set, shard);
