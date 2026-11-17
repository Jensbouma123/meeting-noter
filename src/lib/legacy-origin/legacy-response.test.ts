import { describe, expect, it } from 'vitest';
import { legacyResponse } from './legacy-response';

const opts = { port: 3000, appPort: 47823, version: '0.6.0' };
const get = (url: string, host = 'localhost:3000', method = 'GET') => legacyResponse(method, url, host, opts);

describe('legacyResponse (the one-time listener on the old port)', () => {
  it.each(['evil.example:3000', 'localhost:47823', 'localhost', '127.0.0.1:3000.evil', ''])(
    'refuses Host %j',
    (host) => {
      expect(get('/legacy-export', host).status).toBe(403);
    },
  );

  it('refuses anything but GET and HEAD', () => {
    expect(get('/api/app/status', 'localhost:3000', 'POST').status).toBe(405);
  });

  it('answers the status poll of a 0.5.1 tab with the new version, so it reloads', () => {
    const r = get('/api/app/status', '127.0.0.1:3000');
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body)).toMatchObject({ app: 'meeting-noter', version: '0.6.0' });
  });

  it('serves the export page framable only by the new app origins, with a hash-pinned script', () => {
    const r = get('/legacy-export');
    const csp = r.headers['content-security-policy'];
    expect(csp).toContain('frame-ancestors http://127.0.0.1:47823 http://localhost:47823');
    expect(csp).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("default-src 'none'");
    expect(r.body).toContain('mn.sessions.v1');
    expect(r.body).toContain('["http://127.0.0.1:47823","http://localhost:47823"]');
  });

  it('redirects every other path to the same host on the new port', () => {
    expect(get('/sessions/abc?x=1').headers.location).toBe('http://localhost:47823/sessions/abc?x=1');
    expect(get('/', '127.0.0.1:3000')).toMatchObject({ status: 302, headers: { location: 'http://127.0.0.1:47823/' } });
  });
});
