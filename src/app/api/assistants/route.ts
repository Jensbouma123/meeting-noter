import { defaultDeps } from '@/lib/assistants/deps';
import { listAssistants } from '@/lib/assistants';
import { refuseForeign } from '@/lib/lifecycle/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const refused = refuseForeign(request);
  if (refused) return refused;
  return Response.json({ assistants: await listAssistants(defaultDeps()) });
}
