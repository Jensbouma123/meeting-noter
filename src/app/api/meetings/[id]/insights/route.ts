import type { IdRouteContext } from '@/app/api/types';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { failure, readJson } from '@/lib/meeting-db/http';
import { parseInsightSet } from '@/lib/meeting-db/insights-validate';
import { meetingStore } from '@/lib/meeting-db/meeting-store';
import { isMeetingId } from '@/lib/meeting-db/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isMeetingId(id)) return failure('bad-id', 400);
  const parsed = await readJson(request, 200_000);
  if (!parsed.ok) return parsed.response;
  const insights = parseInsightSet(parsed.value);
  if (!insights) return failure('bad-insights', 400);
  if (!meetingStore().setInsights(id, insights)) return failure('not-found', 404);
  return Response.json({ ok: true });
}
