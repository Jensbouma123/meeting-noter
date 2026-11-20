import fs from 'node:fs';
import path from 'node:path';
import { readJson } from '@/lib/meeting-db/http';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { EXTERNAL_WAV, loadExternalCases } from '../../../../../scripts/echo-eval/lib/external-case';
import { buildMeetings } from '../../../../../scripts/echo-eval/lib/meeting-plan';
import { writeMeetingReport } from '../../../../../scripts/echo-eval/lib/meeting-report';
import { writeReport } from '../../../../../scripts/echo-eval/lib/report';
import { allShards, parseShard } from '../../../../../scripts/echo-eval/lib/shard';
import { mergeShardResults } from '../../../../../scripts/echo-eval/lib/shard-merge';
import { wavDataChunk } from '../../../../../scripts/echo-eval/lib/wav-io';
import { OUT_DIR, resultsFileFor } from '../../../../../scripts/echo-eval/out-dir';
import type { EvalSet } from '../../../../../scripts/echo-eval/types/eval-set';
import type { Shard } from '../../../../../scripts/echo-eval/types/shard';
import { appendResult, begin, doneIds, mark, markerState } from './files';
import { casesFor, externalDir, utterances } from './plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 5_000_000;

const guard = (request: Request): Response | null =>
  process.env.NODE_ENV === 'production' ? new Response('Not found', { status: 404 }) : refuseForeign(request);

const setOf = (raw: string | null): EvalSet => (raw === 'meetings' || raw === 'external' ? raw : 'cases');

const flagsOf = (url: URL) => ({
  fake: url.searchParams.get('fake') === '1',
  set: setOf(url.searchParams.get('set')),
  shard: parseShard(url.searchParams.get('shard'), url.searchParams.get('shards')),
});

const plannedDone = (limit: number | null, fake: boolean, set: EvalSet, shard: Shard | null) => {
  const planned = casesFor(limit, set, shard);
  const plannedIds = new Set(planned.map((c) => c.id));
  const done = doneIds(fake, set, shard).filter((id) => plannedIds.has(id));
  return { planned, done };
};

const writeReports = (fake: boolean, set: EvalSet) => {
  const file = resultsFileFor(fake, set);
  if (set === 'external') writeMeetingReport(OUT_DIR, file, loadExternalCases(externalDir()), 'external');
  else if (set === 'meetings') writeMeetingReport(OUT_DIR, file, buildMeetings(utterances()));
  else writeReport(OUT_DIR, file, utterances().length);
};

const externalPcm = (): Response => {
  const buf = fs.readFileSync(path.join(externalDir(), EXTERNAL_WAV));
  const { offset, size } = wavDataChunk(buf, EXTERNAL_WAV);
  return new Response(buf.subarray(offset, offset + size - (size & 1)), {
    headers: { 'content-type': 'application/octet-stream' },
  });
};

const mergeShards = (count: number, fake: boolean, set: EvalSet) => {
  if (!Number.isInteger(count) || count < 2) throw new Error(`merge needs shards >= 2, got ${count}`);
  const sources = allShards(count).map((s) => resultsFileFor(fake, set, s));
  mergeShardResults(resultsFileFor(fake, set), sources);
  writeReports(fake, set);
  mark({ ok: true }, fake, set);
};

export async function GET(request: Request): Promise<Response> {
  const refused = guard(request);
  if (refused) return refused;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const limit = Number(url.searchParams.get('limit')) || null;
  const { fake, set, shard } = flagsOf(url);
  try {
    if (op === 'plan') {
      const { planned, done } = plannedDone(limit, fake, set, shard);
      return Response.json({ cases: planned, utterances: set === 'external' ? 0 : utterances().length, done });
    }
    if (op === 'status') {
      const { planned, done } = plannedDone(limit, fake, set, shard);
      return Response.json({ done: done.length, total: planned.length, ...markerState(fake, set, shard) });
    }
    if (op === 'wav') return externalPcm();
    if (op === 'audio') {
      const utt = utterances().find((u) => u.id === url.searchParams.get('id'));
      if (!utt) return Response.json({ ok: false, error: 'unknown utterance' }, { status: 404 });
      return new Response(utt.audio.slice().buffer as ArrayBuffer, {
        headers: { 'content-type': 'application/octet-stream' },
      });
    }
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
  return Response.json({ ok: false, error: 'unknown op' }, { status: 400 });
}

export async function POST(request: Request): Promise<Response> {
  const refused = guard(request);
  if (refused) return refused;
  const body = await readJson(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const { fake, set, shard } = flagsOf(url);
  try {
    if (op === 'begin') begin(body.value, fake, set, shard);
    else if (op === 'result') appendResult(body.value, fake, set, shard);
    else if (op === 'finish') {
      if (!shard) writeReports(fake, set);
      mark({ ok: true }, fake, set, shard);
    } else if (op === 'merge') mergeShards(Number(url.searchParams.get('shards')), fake, set);
    else if (op === 'fail') {
      mark({ ok: false, error: String((body.value as { error?: unknown }).error) }, fake, set, shard);
    } else return Response.json({ ok: false, error: 'unknown op' }, { status: 400 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
