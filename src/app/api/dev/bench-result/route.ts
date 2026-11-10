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

export const runtime = 'nodejs';
/** Never cache: every POST writes a distinct file. */
export const dynamic = 'force-dynamic';

/** Refuse absurd bodies (a 5-minute transcript is a few KB; this is a backstop). */
const MAX_BODY_BYTES = 1_000_000;

/** Directory the bench JSON lands in: `test-audio/bench-results` next to the repo. */
export function benchResultsDir(): string {
  const override = process.env.ASR_BENCH_RESULT_DIR;
  if (override) return override;
  return path.join(process.cwd(), '..', 'test-audio', 'bench-results');
}

/** Filesystem-safe, lowercase, bounded: everything but `[a-z0-9._-]` becomes `-`. */
export function slug(value: unknown, fallback = 'unknown'): string {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 48);
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Browser name for the filename. Chrome's UA also says `Safari`, so the
 * Chromium tokens have to be tested first or every run lands as `safari`.
 */
export function browserFromUserAgent(userAgent: unknown): string {
  const ua = String(userAgent ?? '');
  if (/Edg(?:e|A|iOS)?\//.test(ua)) return 'edge';
  if (/OPR\/|Opera|OPiOS\//.test(ua)) return 'opera';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua)) return 'safari';
  return 'unknown';
}

/**
 * `webgpu-fp16` / `webgpu-q4f16` / `wasm-int8` — the same variant ids
 * `scripts/asr-bench-safari.mjs` uses, so §3 of the results doc is comparable.
 * Falls back to `backend`-`encoderQuant` when the page did not send a variant.
 */
export function variantFromPayload(payload: Record<string, unknown>): string {
  const explicit = String(payload.variant ?? '').trim();
  if (explicit) return explicit;
  const backend = String(payload.backend ?? 'unknown').trim() || 'unknown';
  const encoder = String(payload.encoderQuant ?? payload.encoder ?? '').trim();
  return encoder ? `${backend}-${encoder}` : backend;
}

/** ISO-8601 with `:`/`.` swapped for `-`: sortable, and legal in a filename. */
export function fileTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** `<variant>-<browser>-<timestamp>.json`. */
export function resultFileName(payload: Record<string, unknown>, date = new Date()): string {
  const variant = slug(variantFromPayload(payload));
  const browser = slug(browserFromUserAgent(payload.userAgent), 'unknown');
  return `${variant}-${browser}-${fileTimestamp(date)}.json`;
}

/**
 * `…-2.json` for the second run inside the same millisecond. Two POSTs can
 * easily share a timestamp, and the point of one file per run is that a retried
 * run adds evidence instead of overwriting it.
 */
export function disambiguate(name: string, nth: number): string {
  const ext = path.extname(name);
  return `${name.slice(0, name.length - ext.length)}-${nth}${ext}`;
}

export async function POST(request: Request): Promise<Response> {
  // Read at request time (not module scope) so this stays testable and honest
  // if NODE_ENV is set after the module is evaluated.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  // Dev-only, but any page in the browser can fire a CORS-simple POST here, so
  // refuse cross-origin callers and oversized bodies before reading anything.
  const origin = request.headers.get('origin');
  if (origin !== null && origin !== new URL(request.url).origin) {
    return Response.json({ ok: false, error: 'cross-origin request refused' }, { status: 403 });
  }
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
