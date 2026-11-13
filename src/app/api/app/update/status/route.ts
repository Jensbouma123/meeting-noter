import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';
import { readUpdateStatus } from '@/lib/update/update-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  return Response.json(readUpdateStatus(lifecycle().install.stateDir));
}
