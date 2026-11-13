import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { DELETE as removeAll, GET as list } from './route';
import { DELETE as remove, GET as get, PUT as put } from './[id]/route';
import { POST as importMeetings } from './import/route';
import { LOCAL, dataDirFiles, idContext, rawRequest, useTempDataDir } from './testHelpers';

const data = useTempDataDir('meetings-guards-');

describe('Host/Origin on every meetings handler', () => {
  const m = sampleMeeting();
  const body = JSON.stringify(m);
  const foreign: [string, Record<string, string>][] = [
    ['foreign origin', { ...LOCAL, origin: 'https://evil.example' }],
    ['rebound host', { host: 'evil.example:3000' }],
  ];
  it.each(foreign)('refuses every method with a %s', async (_n, headers) => {
    const json = { ...headers, 'content-type': 'application/json' };
    const statuses = [
      (await list(rawRequest('GET', '', headers))).status,
      (await removeAll(rawRequest('DELETE', '', headers))).status,
      (await get(rawRequest('GET', `/${m.id}`, headers), idContext(m.id))).status,
      (await put(rawRequest('PUT', `/${m.id}`, json, body), idContext(m.id))).status,
      (await remove(rawRequest('DELETE', `/${m.id}`, headers), idContext(m.id))).status,
      (await importMeetings(rawRequest('POST', '/import', json, JSON.stringify({ meetings: [m] })))).status,
    ];
    expect(statuses).toEqual([403, 403, 403, 403, 403, 403]);
    expect(dataDirFiles(data.dir)).toEqual([]);
    expect(fs.existsSync(path.join(data.dir, 'meetings.db'))).toBe(false);
  });

  it('a text/plain cross-site "simple" PUT is refused by its Origin, nothing is stored', async () => {
    const res = await put(
      rawRequest('PUT', `/${m.id}`, { ...LOCAL, origin: 'https://evil.example', 'content-type': 'text/plain' }, body),
      idContext(m.id),
    );
    expect(res.status).toBe(403);
    expect(fs.existsSync(path.join(data.dir, 'meetings.db'))).toBe(false);
  });
});
