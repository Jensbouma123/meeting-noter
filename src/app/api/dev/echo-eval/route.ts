import { readJson } from '@/lib/meeting-db/http';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { writeMeetingReport } from '../../../../../scripts/echo-eval/lib/meeting-report';
import { writeReport } from '../../../../../scripts/echo-eval/lib/report';
import { OUT_DIR, resultsFileFor } from '../../../../../scripts/echo-eval/out-dir';
import { appendResult, begin, doneIds, mark, markerState } from './files';
import { casesFor, utterances } from './plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 5_000_000;

const guard = (request: Request): Response | null =>
  process.env.NODE_ENV === 'production' ? new Response('Not found', { status: 404 }) : refuseForeign(request);

const plannedDone = (limit: number | null, fake: boolean, meetings: boolean) => {
  const planned = casesFor(limit, meetings);
  const plannedIds = new Set(planned.map((c) => c.id));
  const done = doneIds(fake, meetings).filter((id) => plannedIds.has(id));
  return { planned, done };
};

export async function GET(request: Request): Promise<Response> {
  const refused = guard(request);
  if (refused) return refused;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const limit = Number(url.searchParams.get('limit')) || null;
  const fake = url.searchParams.get('fake') === '1';
  const meetings = url.searchParams.get('set') === 'meetings';
  try {
    if (op === 'plan') {
      const { planned, done } = plannedDone(limit, fake, meetings);
      return Response.json({ cases: planned, utterances: utterances().length, done });
    }
    if (op === 'status') {
      const { planned, done } = plannedDone(limit, fake, meetings);
      return Response.json({ done: done.length, total: planned.length, ...markerState(fake, meetings) });
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
  const fake = url.searchParams.get('fake') === '1';
  const meetings = url.searchParams.get('set') === 'meetings';
  try {
    if (op === 'begin') begin(body.value, fake, meetings);
    else if (op === 'result') appendResult(body.value, fake, meetings);
    else if (op === 'finish') {
      if (meetings) writeMeetingReport(OUT_DIR, resultsFileFor(fake, true), utterances());
      else writeReport(OUT_DIR, resultsFileFor(fake), utterances().length);
      mark({ ok: true }, fake, meetings);
    } else if (op === 'fail') mark({ ok: false, error: String((body.value as { error?: unknown }).error) }, fake, meetings);
    else return Response.json({ ok: false, error: 'unknown op' }, { status: 400 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
