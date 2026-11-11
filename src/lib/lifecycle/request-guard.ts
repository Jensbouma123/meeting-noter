/**
 * The /api/app routes act on this Mac (stop the server, run the installer), so
 * only same-origin pages on localhost may call them: a foreign page fails the
 * Origin check, and a DNS-rebinding page fails the Host check.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function refuseForeign(request: Request): Response | null {
  const host = request.headers.get('host') ?? '';
  const hostname = host.replace(/:\d+$/, '');
  if (!LOCAL_HOSTS.has(hostname)) return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin !== null) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (originHost !== host) return Response.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  return null;
}
