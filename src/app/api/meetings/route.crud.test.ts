import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { GET as list } from './route';
import { GET as get, PUT as put } from './[id]/route';
import { idContext, jsonRequest, localRequest, registerTempDataDir } from './testHelpers';

const data = registerTempDataDir('meetings-api-');

describe('/api/meetings', () => {
  it('stores a meeting with PUT, reads it back, lists and searches it', async () => {
    const m = sampleMeeting();
    expect((await put(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id))).status).toBe(200);
    expect(fs.existsSync(path.join(data.dir, 'meetings.db'))).toBe(true);
    expect(fs.readdirSync(path.join(data.dir, 'meetings'))).toHaveLength(1);

    const one = await (await get(localRequest(`/${m.id}`), idContext(m.id))).json();
    expect(one.meeting.segments).toHaveLength(2);

    const all = await (await list(localRequest(''))).json();
    expect(all.dataDir).toBe(data.dir);
    expect(all.meetings.map((x: { id: string }) => x.id)).toEqual([m.id]);

    const found = await (await list(localRequest('?q=quarterly'))).json();
    expect(found.meetings[0].snippet).toContain('[quarterly]');
  });

  it('lists in pages with limit and offset', async () => {
    for (const [id, day] of [['m1', 1], ['m2', 2], ['m3', 3]] as const) {
      const m = sampleMeeting({ id, startedAt: Date.UTC(2026, 10, day) });
      await put(jsonRequest('PUT', `/${id}`, m), idContext(id));
    }
    const page = async (q: string) =>
      ((await (await list(localRequest(q))).json()).meetings as { id: string }[]).map((x) => x.id);
    expect(await page('?limit=2')).toEqual(['m3', 'm2']);
    expect(await page('?limit=2&offset=2')).toEqual(['m1']);
  });

  it('answers an older copy with 409 and the stored meeting', async () => {
    const m = sampleMeeting();
    await put(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id));
    const res = await put(jsonRequest('PUT', `/${m.id}`, { ...m, title: 'Old', updatedAt: 1 }), idContext(m.id));
    expect(res.status).toBe(409);
    expect((await res.json()).meeting.title).toBe('Roadmap sync');
  });

  it('refuses a body whose id does not match the URL, and bad ids', async () => {
    const m = sampleMeeting();
    expect((await put(jsonRequest('PUT', '/other', m), idContext('other'))).status).toBe(400);
    expect((await get(localRequest('/..%2F'), idContext('../x'))).status).toBe(400);
  });

  it('refuses pages from another origin', async () => {
    const m = sampleMeeting();
    const res = await put(
      jsonRequest('PUT', `/${m.id}`, m, { origin: 'https://evil.example' }),
      idContext(m.id),
    );
    expect(res.status).toBe(403);
    expect((await list(new Request('http://evil.example/api/meetings', { headers: { host: 'evil.example' } }))).status).toBe(403);
  });
});
