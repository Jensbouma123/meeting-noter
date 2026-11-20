import { connectAssistant } from '@/lib/assistants';
import { defaultDeps } from '@/lib/assistants/deps';
import { isAssistantId } from '@/lib/assistants/ids';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { failure, readJson } from '@/lib/meeting-db/http';
import type { IdRouteContext } from '../../../types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isAssistantId(id)) return failure('unknown-assistant', 404);
  const parsed = await readJson(request, 1_000);
  if (!parsed.ok) return parsed.response;
  const confirm = (parsed.value as { confirm?: unknown } | undefined)?.confirm === true;
  return Response.json(await connectAssistant(id, defaultDeps(), confirm));
}
