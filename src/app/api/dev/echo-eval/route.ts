import { readJson } from '@/lib/meeting-db/http';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { writeReport } from '../../../../../scripts/echo-eval/lib/report';
import { OUT_DIR, RESULTS_FILE } from '../../../../../scripts/echo-eval/out-dir';
import { appendResult, begin, doneIds, mark, markerState } from './files';
import { casesFor, utterances } from './plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 5_000_000;

const guard = (request: Request): Response | null =>
  process.env.NODE_ENV === 'production' ? new Response('Not found', { status: 404 }) : refuseForeign(request);

export async function GET(request: Request): Promise<Response> {
  const refused = guard(request);
  if (refused) return refused;
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const limit = Number(url.searchParams.get('limit')) || null;
  try {
    if (op === 'plan') {
      return Response.json({ cases: casesFor(limit), utterances: utterances().length, done: doneIds() });
    }
    if (op === 'status') {
      return Response.json({ done: doneIds().length, total: casesFor(limit).length, ...markerState() });
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
  const op = new URL(request.url).searchParams.get('op');
  try {
    if (op === 'begin') begin(body.value);
    else if (op === 'result') appendResult(body.value);
    else if (op === 'finish') {
      writeReport(OUT_DIR, RESULTS_FILE, utterances().length);
      mark({ ok: true });
    } else if (op === 'fail') mark({ ok: false, error: String((body.value as { error?: unknown }).error) });
    else return Response.json({ ok: false, error: 'unknown op' }, { status: 400 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
  return Response.json({ ok: true });
}
