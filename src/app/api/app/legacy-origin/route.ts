import { completeLegacyBridge, legacyBridge } from '@/lib/legacy-origin/legacy-bridge';
import { refuseForeign } from '@/lib/lifecycle/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  return Response.json({ state: legacyBridge().state });
}

export function POST(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return Response.json({ ok: false, error: 'json-required' }, { status: 415 });
  }
  if (legacyBridge().state !== 'listening')
    return Response.json({ ok: false, state: legacyBridge().state }, { status: 409 });
  return Response.json({ ok: true, state: completeLegacyBridge().state });
}
