/**
 * `GET /api/app/update`  — is a newer release available and can this install apply it?
 * `POST /api/app/update` — start applying it (progress: GET /api/app/update/status).
 * Contract: ux-redesign/backend-contract.md.
 */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';
import { buildCheck, fetchRelease } from '@/lib/update/release-check';
import { startUpdate } from '@/lib/update/start-update';
import { readUpdateStatus, updateRunning } from '@/lib/update/update-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GitHub allows 60 unauthenticated calls an hour; one check per 10 min is plenty. */
const CACHE_MS = 10 * 60_000;
let cache: { at: number; release: Awaited<ReturnType<typeof fetchRelease>> } | null = null;

async function release(refresh: boolean) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.release;
  const r = await fetchRelease(lifecycle().install.current);
  cache = { at: Date.now(), release: r };
  return r;
}

export async function GET(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { install } = lifecycle();
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  return Response.json(buildCheck(install, await release(refresh), updateRunning(install.stateDir)));
}

export async function POST(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  // A JSON content type makes a cross-origin POST need a CORS preflight, which this route never grants.
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return Response.json({ ok: false, error: 'json-required' }, { status: 415 });
  }
  const { install } = lifecycle();
  const check = buildCheck(install, await release(true), updateRunning(install.stateDir));
  if (!check.canApply || !check.latest) {
    const error = check.applyBlockedReason ?? 'already-latest';
    const status = check.applyBlockedReason === 'already-running' ? readUpdateStatus(install.stateDir) : null;
    return Response.json({ ok: false, error, status }, { status: 409 });
  }
  try {
    return Response.json({ ok: true, status: startUpdate(install, check.latest) }, { status: 202 });
  } catch (err) {
    console.error('[meeting-noter] update did not start:', err);
    return Response.json({ ok: false, error: 'start-failed', status: null }, { status: 500 });
  }
}
