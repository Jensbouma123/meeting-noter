import { parseBeat } from '@/lib/lifecycle/parse-beat';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const bodyText = await request.text().catch(() => '');
  const parsed = bodyText.length <= 1_000 ? parseBeat(bodyText) : null;
  if (!parsed) return Response.json({ ok: false, error: 'bad-heartbeat' }, { status: 400 });
  const lc = lifecycle();
  lc.tracker.beat(parsed.clientId, parsed.beat);
  return Response.json({ ok: true, idleShutdown: lc.idleShutdown });
}
