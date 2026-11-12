/**
 * `POST /api/dev/bench-result` — the sink a `/dev/asr-bench` run posts itself to.
 *
 * Why this exists: safaridriver cannot open a session on this Mac (`POST /session`
 * → `500 session not created: The session timed out while connecting to a Safari
 * instance`), so the bench runs without any WebDriver: a human opens one chained
 * URL in Safari, the page runs each variant and POSTs the very same JSON it
 * renders into `#bench-result` here. `scripts/asr-bench-score.mjs` then reads the
 * files from disk and scores WER offline. The **absence** of a file is the crash
 * signal — a tab that dies mid-run never gets to post.
 *
 * One file per POST: `<variant>-<browser>-<timestamp>.json` under
 * `<repo>/../test-audio/bench-results/`, so a retried or repeated run adds rows
 * instead of overwriting the evidence of the previous one.
 *
 * Dev-only by construction: in a production build this handler 404s, so the
 * route cannot become a write-anywhere endpoint in a deployed app. It also only
 * ever writes inside the bench directory (`join` + sanitised components), never
 * to a path taken from the request body.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { benchResultsDir, disambiguate, resultFileName } from './helpers';

export const runtime = 'nodejs';
/** Never cache: every POST writes a distinct file. */
export const dynamic = 'force-dynamic';

/** Refuse absurd bodies (a 5-minute transcript is a few KB; this is a backstop). */
const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request): Promise<Response> {
  // Read at request time (not module scope) so this stays testable and honest
  // if NODE_ENV is set after the module is evaluated.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  // Dev-only, but any page in the browser can fire a CORS-simple POST here, and a
  // DNS-rebinding page can reach it under a foreign Host: refuse both, and oversized
  // bodies, before reading anything.
  const refused = refuseForeign(request);
  if (refused) return refused;
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return Response.json(
      { ok: false, error: `body is ${declared} bytes, over the ${MAX_BODY_BYTES}-byte cap` },
      { status: 413 },
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ ok: false, error: 'could not read the request body' }, { status: 400 });
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return Response.json(
      { ok: false, error: `body is ${Buffer.byteLength(raw, 'utf8')} bytes, over the ${MAX_BODY_BYTES}-byte cap` },
      { status: 413 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not a JSON object');
    }
    payload = parsed as Record<string, unknown>;
  } catch (err) {
    return Response.json(
      { ok: false, error: `body is not a JSON object: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  const dir = benchResultsDir();
  const name = resultFileName(payload);
  const receivedAt = new Date().toISOString();
  const serialize = (file: string) =>
    `${JSON.stringify({ ...payload, receivedAt, file }, null, 2)}\n`;

  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: `could not create ${dir}: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // `wx` = create-or-fail, so two POSTs in the same millisecond cannot clobber
  // each other; the loser retries under the next free name.
  let file = null;
  for (let nth = 0; nth < 100; nth++) {
    const candidate = nth === 0 ? name : disambiguate(name, nth);
    try {
      await writeFile(path.join(dir, candidate), serialize(candidate), { encoding: 'utf8', flag: 'wx' });
      file = path.join(dir, candidate);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'EEXIST') continue;
      return Response.json(
        {
          ok: false,
          error: `could not write ${dir}: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 500 },
      );
    }
  }
  if (file === null) {
    return Response.json({ ok: false, error: `no free filename left for ${name}` }, { status: 500 });
  }

  return Response.json({ ok: true, file: path.basename(file) });
}
