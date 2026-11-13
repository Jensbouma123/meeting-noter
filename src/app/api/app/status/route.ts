/** `GET /api/app/status` — identifies this server (launcher.sh tells "ours" from another program on the port). */
import { refuseForeign } from '@/lib/lifecycle/request-guard';
import { lifecycle } from '@/lib/lifecycle/server-lifecycle';
import { updateRunning } from '@/lib/update/update-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const refused = refuseForeign(request);
  if (refused) return refused;
  const lc = lifecycle();
  return Response.json({
    app: 'meeting-noter',
    version: lc.install.current,
    pid: process.pid,
    installKind: lc.install.kind,
    idleShutdown: lc.idleShutdown,
    clients: lc.tracker.openClients(),
    recording: lc.tracker.recording(),
    updateRunning: updateRunning(lc.install.stateDir),
  });
}
