/** `GET /api/app/update/status` — progress of the last in-app update (survives the server restart). */
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';
import { readUpdateStatus } from '@/lib/update/server-update';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(readUpdateStatus(lifecycle().install.stateDir));
}
