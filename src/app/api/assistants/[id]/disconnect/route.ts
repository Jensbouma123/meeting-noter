import { disconnectAssistant } from '@/lib/assistants';
import { defaultDeps } from '@/lib/assistants/deps';
import { isAssistantId } from '@/lib/assistants/ids';
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { failure } from '@/lib/meeting-db/http';
import type { IdRouteContext } from '../../../types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: IdRouteContext): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const { id } = await params;
  if (!isAssistantId(id)) return failure('unknown-assistant', 404);
  return Response.json(await disconnectAssistant(id, defaultDeps()));
}
