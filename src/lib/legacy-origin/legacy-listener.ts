import { createServer } from 'node:http';
import { LISTEN_WINDOW_MS } from './constants';
import { legacyResponse } from './legacy-response';
import type { LegacyListenOptions } from './types';

export function startLegacyListener(opts: LegacyListenOptions): Promise<(() => void) | null> {
  const server = createServer((req, res) => {
    const reply = legacyResponse(req.method ?? 'GET', req.url ?? '/', req.headers.host ?? '', opts);
    res.writeHead(reply.status, reply.headers);
    res.end(req.method === 'HEAD' ? undefined : reply.body);
  });
  const close = () => {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
  };
  const timer = setTimeout(() => {
    close();
    opts.onExpire?.();
  }, opts.windowMs ?? LISTEN_WINDOW_MS);
  timer.unref();
  return new Promise((resolve) => {
    server.once('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    server.listen(opts.port, '127.0.0.1', () => {
      server.unref();
      resolve(close);
    });
  });
}
