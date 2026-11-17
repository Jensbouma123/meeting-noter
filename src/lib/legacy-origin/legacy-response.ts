import { EXPORT_PATH, STATUS_PATH } from './constants';
import { exportPage } from './export-page';
import type { LegacyListenOptions, LegacyResponse } from './types';

const NO_STORE = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export function legacyResponse(
  method: string,
  rawUrl: string,
  host: string,
  opts: LegacyListenOptions,
): LegacyResponse {
  const hostname = host.replace(/:\d+$/, '');
  if (host !== `localhost:${opts.port}` && host !== `127.0.0.1:${opts.port}`) {
    return { status: 403, headers: NO_STORE, body: 'forbidden' };
  }
  if (method !== 'GET' && method !== 'HEAD') return { status: 405, headers: NO_STORE, body: 'method not allowed' };
  const url = new URL(rawUrl, `http://${host}`);
  if (url.pathname === STATUS_PATH) {
    const body = JSON.stringify({ app: 'meeting-noter', version: opts.version, legacyOrigin: true });
    return { status: 200, headers: { ...NO_STORE, 'content-type': 'application/json' }, body };
  }
  if (url.pathname === EXPORT_PATH) {
    const page = exportPage(opts.appPort);
    return {
      status: 200,
      headers: { ...NO_STORE, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': page.csp },
      body: page.html,
    };
  }
  const location = `http://${hostname}:${opts.appPort}${url.pathname}${url.search}`;
  return { status: 302, headers: { ...NO_STORE, location }, body: '' };
}
