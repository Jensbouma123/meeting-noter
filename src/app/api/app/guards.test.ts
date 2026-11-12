import { describe, expect, it } from 'vitest';
import { GET as status } from './status/route';
import { POST as heartbeat } from './heartbeat/route';
import { GET as updateCheck, POST as update } from './update/route';
import { GET as updateStatus } from './update/status/route';

/** The /api/app routes act on this Mac: foreign pages and rebound hosts get 403 before anything runs. */

const make = (method: string, headers: Record<string, string>, body?: string) =>
  new Request('http://localhost:3000/api/app/x', { method, headers, body });
const FOREIGN: Record<string, string>[] = [
  { host: 'localhost:3000', origin: 'https://evil.example' },
  { host: 'evil.example:3000' },
];

describe('/api/app guards', () => {
  it.each(FOREIGN)('POST routes refuse %j', async (headers) => {
    const json = { ...headers, 'content-type': 'application/json' };
    expect((await heartbeat(make('POST', json, '{"clientId":"abcdefgh"}'))).status).toBe(403);
    expect((await update(make('POST', json, '{}'))).status).toBe(403);
  });

  it.each(FOREIGN)('GET routes that expose this machine refuse %j', async (headers) => {
    expect((await status(make('GET', headers))).status).toBe(403);
    expect((await updateCheck(make('GET', headers))).status).toBe(403);
    expect((await updateStatus(make('GET', headers))).status).toBe(403);
  });

  it('update POST demands a JSON content type, so a cross-origin form post cannot start it', async () => {
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      const res = await update(make('POST', { host: 'localhost:3000', 'content-type': type }, 'x'));
      expect(res.status).toBe(415);
    }
    expect((await update(make('POST', { host: 'localhost:3000' }))).status).toBe(415);
  });

  it('heartbeat rejects a bad or oversize body', async () => {
    const local = { host: 'localhost:3000' };
    expect((await heartbeat(make('POST', local, 'not json'))).status).toBe(400);
    expect((await heartbeat(make('POST', local, '{"clientId":"../../x"}'))).status).toBe(400);
    expect((await heartbeat(make('POST', local, JSON.stringify({ clientId: 'abcdefgh', pad: 'x'.repeat(2000) })))).status).toBe(400);
  });
});
