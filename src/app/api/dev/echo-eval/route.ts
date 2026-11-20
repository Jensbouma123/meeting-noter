import { readJson } from '@/lib/meeting-db/http';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { writeMeetingReport } from '../../../../../scripts/echo-eval/lib/meeting-report';
import { writeReport } from '../../../../../scripts/echo-eval/lib/report';
import { allShards, parseShard } from '../../../../../scripts/echo-eval/lib/shard';
import { mergeShardResults } from '../../../../../scripts/echo-eval/lib/shard-merge';
import { OUT_DIR, resultsFileFor } from '../../../../../scripts/echo-eval/out-dir';
import type { Shard } from '../../../../../scripts/echo-eval/types/shard';
import { appendResult, begin, doneIds, mark, markerState } from './files';
import { casesFor, utterances } from './plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 5_000_000;

const guard = (request: Request): Response | null =>
  process.env.NODE_ENV === 'production' ? new Response('Not found', { status: 404 }) : refuseForeign(request);

const flagsOf = (url: URL) => ({
  fake: url.searchParams.get('fake') === '1',
  meetings: url.searchParams.get('set') === 'meetings',
  shard: parseShard(url.searchParams.get('shard'), url.searchParams.get('shards')),
});

const plannedDone = (limit: number | null, fake: boolean, meetings: boolean, shard: Shard | null) => {
  const planned = casesFor(limit, meetings, shard);
  const plannedIds = new Set(planned.map((c) => c.id));
  const done = doneIds(fake, meetings, shard).filter((id) => plannedIds.has(id));
  return { planned, done };
};

const writeReports = (fake: boolean, meetings: boolean) => {
  if (meetings) writeMeetingReport(OUT_DIR, resultsFileFor(fake, true), utterances());
  else writeReport(OUT_DIR, resultsFileFor(fake), utterances().length);
};

const mergeShards = (count: number, fake: boolean, meetings: boolean) => {
  if (!Number.isInteger(count) || count < 2) throw new Error(`merge needs shards >= 2, got ${count}`);
  const sources = allShards(count).map((s) => resultsFileFor(fake, meetings, s));
  mergeShardResults(resultsFileFor(fake, meetings), sources);
  writeReports(fake, meetings);
  mark({ ok: true }, fake, meetings);
};

export async function GET(request: Request): Promise<Response> {
  const refused = guard(request);
  if (refused) return refused;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const limit = Number(url.searchParams.get('limit')) || null;
  const { fake, meetings, shard } = flagsOf(url);
  try {
    if (op === 'plan') {
      const { planned, done } = plannedDone(limit, fake, meetings, shard);
      return Response.json({ cases: planned, utterances: utterances().length, done });
    }
    if (op === 'status') {
      const { planned, done } = plannedDone(limit, fake, meetings, shard);
      return Response.json({ done: done.length, total: planned.length, ...markerState(fake, meetings, shard) });
    }
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
  const { fake, meetings, shard } = flagsOf(url);
  try {
    if (op === 'begin') begin(body.value, fake, meetings, shard);
    else if (op === 'result') appendResult(body.value, fake, meetings, shard);
    else if (op === 'finish') {
      if (!shard) writeReports(fake, meetings);
      mark({ ok: true }, fake, meetings, shard);
    } else if (op === 'merge') mergeShards(Number(url.searchParams.get('shards')), fake, meetings);
    else if (op === 'fail') {
      mark({ ok: false, error: String((body.value as { error?: unknown }).error) }, fake, meetings, shard);
    } else return Response.json({ ok: false, error: 'unknown op' }, { status: 400 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
