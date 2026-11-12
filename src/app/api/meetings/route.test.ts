import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { GET as list } from './route';
import { DELETE as remove, GET as get, PUT as put } from './[id]/route';
import { POST as importMeetings } from './import/route';

/**
 * The /api/meetings routes over a DB in a temp folder (MEETING_NOTER_DATA_DIR):
 * the app's only way to the meetings on disk.
 */

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-api-'));
  env.MEETING_NOTER_DATA_DIR = dir;
});
afterEach(() => {
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const url = (p: string) => `http://localhost:3000/api/meetings${p}`;
/** Node's Request sets no Host header; the routes refuse a request without a local one. */
const HOST = { host: 'localhost:3000' };
const req = (p: string, init: RequestInit = {}) =>
  new Request(url(p), { ...init, headers: { ...HOST, ...(init.headers as Record<string, string>) } });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (method: string, p: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url(p), {
    method,
    headers: { ...HOST, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('/api/meetings', () => {
  it('stores a meeting with PUT, reads it back, lists and searches it', async () => {
    const m = sampleMeeting();
    expect((await put(json('PUT', `/${m.id}`, m), ctx(m.id))).status).toBe(200);
    expect(fs.existsSync(path.join(dir, 'meetings.db'))).toBe(true);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toHaveLength(1);

    const one = await (await get(req(`/${m.id}`), ctx(m.id))).json();
    expect(one.meeting.segments).toHaveLength(2);

    const all = await (await list(req(''))).json();
    expect(all.dataDir).toBe(dir);
    expect(all.meetings.map((x: { id: string }) => x.id)).toEqual([m.id]);

    const found = await (await list(req('?q=quarterly'))).json();
    expect(found.meetings[0].snippet).toContain('[quarterly]');
  });

  it('lists in pages with limit and offset', async () => {
    for (const [id, day] of [['m1', 1], ['m2', 2], ['m3', 3]] as const) {
      const m = sampleMeeting({ id, startedAt: Date.UTC(2026, 10, day) });
      await put(json('PUT', `/${id}`, m), ctx(id));
    }
    const page = async (q: string) =>
      ((await (await list(req(q))).json()).meetings as { id: string }[]).map((x) => x.id);
    expect(await page('?limit=2')).toEqual(['m3', 'm2']);
    expect(await page('?limit=2&offset=2')).toEqual(['m1']);
  });

  it('answers an older copy with 409 and the stored meeting', async () => {
    const m = sampleMeeting();
    await put(json('PUT', `/${m.id}`, m), ctx(m.id));
    const res = await put(json('PUT', `/${m.id}`, { ...m, title: 'Old', updatedAt: 1 }), ctx(m.id));
    expect(res.status).toBe(409);
    expect((await res.json()).meeting.title).toBe('Roadmap sync');
  });

  it('refuses a body whose id does not match the URL, and bad ids', async () => {
    const m = sampleMeeting();
    expect((await put(json('PUT', '/other', m), ctx('other'))).status).toBe(400);
    expect((await get(req('/..%2F'), ctx('../x'))).status).toBe(400);
  });

  it('deletes a meeting and its Markdown file', async () => {
    const m = sampleMeeting();
    await put(json('PUT', `/${m.id}`, m), ctx(m.id));
    const res = await remove(req(`/${m.id}`, { method: 'DELETE' }), ctx(m.id));
    expect(await res.json()).toEqual({ ok: true, deleted: true });
    expect((await get(req(`/${m.id}`), ctx(m.id))).status).toBe(404);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toEqual([]);
  });

  it('keeps a deleted meeting deleted: PUT gets 410, import skips it, the list names it', async () => {
    const m = sampleMeeting();
    await put(json('PUT', `/${m.id}`, m), ctx(m.id));
    await remove(req(`/${m.id}`, { method: 'DELETE' }), ctx(m.id));
    const newer = { ...m, updatedAt: m.updatedAt + 60_000 };
    expect((await put(json('PUT', `/${m.id}`, newer), ctx(m.id))).status).toBe(410);
    const imported = await (await importMeetings(json('POST', '/import', { meetings: [newer] }))).json();
    expect(imported).toMatchObject({ imported: 0, skipped: 1 });
    const all = await (await list(req(''))).json();
    expect(all.meetings).toEqual([]);
    expect(all.deleted).toEqual([m.id]);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toEqual([]);
  });

  it('import is idempotent: a second run skips what the first stored', async () => {
    const body = { meetings: [sampleMeeting(), sampleMeeting({ id: 'b' }), { id: '../bad' }] };
    const first = await (await importMeetings(json('POST', '/import', body))).json();
    expect(first).toMatchObject({ ok: true, imported: 2, skipped: 0, invalid: 1, dataDir: dir });
    const second = await (await importMeetings(json('POST', '/import', body))).json();
    expect(second).toMatchObject({ imported: 0, skipped: 2, invalid: 1 });
    expect([first.firstImport, second.firstImport]).toEqual([true, false]);
  });

  it('refuses pages from another origin', async () => {
    const m = sampleMeeting();
    const res = await put(json('PUT', `/${m.id}`, m, { origin: 'https://evil.example' }), ctx(m.id));
    expect(res.status).toBe(403);
    expect((await list(new Request('http://evil.example/api/meetings', { headers: { host: 'evil.example' } }))).status).toBe(403);
  });
});
