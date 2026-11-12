import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { PUT as put } from '../meetings/[id]/route';
import { PUT as fileMeeting } from '../meetings/[id]/folder/route';
import { GET as getFolders, POST as post } from './route';
import { DELETE as del, PATCH as patch } from './[id]/route';

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'folders-route-'));
  env.MEETING_NOTER_DATA_DIR = dir;
});
afterEach(() => {
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const LOCAL = { host: 'localhost:3000', 'content-type': 'application/json' };
const req = (method: string, p: string, body?: unknown, headers: Record<string, string> = LOCAL) =>
  new Request(`http://localhost:3000/api${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe('/api/folders', () => {
  it('refuses foreign hosts and origins on every handler', async () => {
    const bad = [{ host: 'evil.example:3000' }, { ...LOCAL, origin: 'https://evil.example' }];
    for (const h of bad) {
      const s = [
        (await getFolders(req('GET', '/folders', undefined, h))).status,
        (await post(req('POST', '/folders', { name: 'x' }, h))).status,
        (await patch(req('PATCH', '/folders/a', { name: 'x' }, h), ctx('a'))).status,
        (await del(req('DELETE', '/folders/a', undefined, h), ctx('a'))).status,
        (await fileMeeting(req('PUT', '/meetings/a/folder', { folderId: null }, h), ctx('a'))).status,
      ];
      expect(s).toEqual([403, 403, 403, 403, 403]);
    }
    expect(((await (await getFolders(req('GET', '/folders'))).json()) as { folders: unknown[] }).folders).toEqual([]);
  });

  it('creates, moves, files and deletes; maps errors to statuses', async () => {
    const mk = async (name: string, parentId?: string) =>
      ((await (await post(req('POST', '/folders', { name, parentId }))).json()) as { folder: { id: string } }).folder.id;
    const a = await mk('A');
    const b = await mk('B', a);
    expect((await post(req('POST', '/folders', { name: '' }))).status).toBe(400);
    expect((await post(req('POST', '/folders', { name: 'x', parentId: 'ghost' }))).status).toBe(400);
    expect((await patch(req('PATCH', `/folders/${a}`, { parentId: b }), ctx(a))).status).toBe(409);
    expect((await patch(req('PATCH', '/folders/ghost', { name: 'x' }), ctx('ghost'))).status).toBe(404);
    expect((await patch(req('PATCH', `/folders/${b}`, { name: 'B2', parentId: null }), ctx(b))).status).toBe(200);

    const m = sampleMeeting();
    expect((await put(req('PUT', `/meetings/${m.id}`, { ...m, folderId: b }), ctx(m.id))).status).toBe(200);
    expect((await fileMeeting(req('PUT', '/x', { folderId: 'ghost' }), ctx(m.id))).status).toBe(400);
    expect((await fileMeeting(req('PUT', '/x', { folderId: a }), ctx('nope'))).status).toBe(404);
    expect((await fileMeeting(req('PUT', '/x', { folderId: a }), ctx(m.id))).status).toBe(200);

    expect((await del(req('DELETE', `/folders/${a}?mode=bogus`), ctx(a))).status).toBe(400);
    const res = await del(req('DELETE', `/folders/${a}?mode=delete-contents`), ctx(a));
    expect(await res.json()).toEqual({ ok: true, deleted: { folders: 1, meetings: 1 } });
    expect((await del(req('DELETE', `/folders/${a}`), ctx(a))).status).toBe(404);
  });
});
