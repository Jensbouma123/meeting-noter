import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { meetingStore } from '@/lib/meeting-db/store';
import { DELETE as removeAll, GET as list } from './route';
import { DELETE as remove, GET as get, PUT as put } from './[id]/route';
import { POST as importMeetings } from './import/route';
import { idContext, jsonRequest, localRequest, registerTempDataDir } from './testHelpers';

const data = registerTempDataDir('meetings-api-');

describe('/api/meetings deletion', () => {
  it('deletes a meeting and its Markdown file', async () => {
    const m = sampleMeeting();
    const folder = meetingStore().createFolder('Keep this folder');
    await put(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id));
    const markdownFile = meetingStore().db.markdownFile(m.id)!;
    const res = await remove(localRequest(`/${m.id}`, { method: 'DELETE' }), idContext(m.id));
    expect(await res.json()).toEqual({ ok: true, deleted: true });
    expect((await get(localRequest(`/${m.id}`), idContext(m.id))).status).toBe(404);
    expect(fs.existsSync(path.join(data.dir, 'meetings', markdownFile))).toBe(false);
    expect(meetingStore().db.listFolders()).toContainEqual(expect.objectContaining({ id: folder.id, name: 'Keep this folder' }));
  });

  it('keeps a deleted meeting deleted: PUT gets 410, import skips it, the list names it', async () => {
    const m = sampleMeeting();
    await put(jsonRequest('PUT', `/${m.id}`, m), idContext(m.id));
    await remove(localRequest(`/${m.id}`, { method: 'DELETE' }), idContext(m.id));
    const newer = { ...m, updatedAt: m.updatedAt + 60_000 };
    expect((await put(jsonRequest('PUT', `/${m.id}`, newer), idContext(m.id))).status).toBe(410);
    const imported = await (await importMeetings(jsonRequest('POST', '/import', { meetings: [newer] }))).json();
    expect(imported).toMatchObject({ imported: 0, skipped: 1 });
    const all = await (await list(localRequest(''))).json();
    expect(all.meetings).toEqual([]);
    expect(all.deleted).toEqual([m.id]);
    expect(fs.readdirSync(path.join(data.dir, 'meetings'))).toEqual([]);
  });

  it('DELETE /api/meetings removes every meeting, Markdown file and trace of their text', async () => {
    const a = sampleMeeting();
    const folder = meetingStore().createFolder('Keep after delete all');
    await put(jsonRequest('PUT', `/${a.id}`, a), idContext(a.id));
    await put(jsonRequest('PUT', '/b', sampleMeeting({ id: 'b' })), idContext('b'));
    const markdownFiles = [meetingStore().db.markdownFile(a.id)!, meetingStore().db.markdownFile('b')!];
    expect(await (await removeAll(localRequest('', { method: 'DELETE' }))).json()).toEqual({ ok: true, deleted: 2 });
    const all = await (await list(localRequest(''))).json();
    expect(all.meetings).toEqual([]);
    expect(all.deleted.sort()).toEqual(['b', a.id].sort());
    for (const markdownFile of markdownFiles) expect(fs.existsSync(path.join(data.dir, 'meetings', markdownFile))).toBe(false);
    expect(meetingStore().db.listFolders()).toContainEqual(expect.objectContaining({ id: folder.id, name: 'Keep after delete all' }));
    const raw = ['', '-wal'].map((x) => (fs.existsSync(path.join(data.dir, 'meetings.db') + x) ? fs.readFileSync(path.join(data.dir, 'meetings.db') + x, 'latin1') : '')).join('');
    expect(raw).not.toContain('quarterly budget');
    expect((await removeAll(new Request('http://evil.example/api/meetings', { method: 'DELETE', headers: { host: 'evil.example' } }))).status).toBe(403);
  });

  it('after DELETE all, a stale PUT gets 410 and a stale import is skipped: nothing is resurrected', async () => {
    const a = sampleMeeting();
    await put(jsonRequest('PUT', `/${a.id}`, a), idContext(a.id));
    await removeAll(localRequest('', { method: 'DELETE' }));
    const newer = { ...a, updatedAt: a.updatedAt + 60_000 };
    expect((await put(jsonRequest('PUT', `/${a.id}`, newer), idContext(a.id))).status).toBe(410);
    expect(await (await importMeetings(jsonRequest('POST', '/import', { meetings: [newer] }))).json()).toMatchObject({ imported: 0, skipped: 1 });
    expect((await get(localRequest(`/${a.id}`), idContext(a.id))).status).toBe(404);
    expect((await (await list(localRequest(''))).json()).meetings).toEqual([]);
    expect(fs.readdirSync(path.join(data.dir, 'meetings'))).toEqual([]);
  });

  it('import is idempotent: a second run skips what the first stored', async () => {
    const body = { meetings: [sampleMeeting(), sampleMeeting({ id: 'b' }), { id: '../bad' }] };
    const first = await (await importMeetings(jsonRequest('POST', '/import', body))).json();
    expect(first).toMatchObject({ ok: true, imported: 2, skipped: 0, invalid: 1, dataDir: data.dir });
    const second = await (await importMeetings(jsonRequest('POST', '/import', body))).json();
    expect(second).toMatchObject({ imported: 0, skipped: 2, invalid: 1 });
    expect([first.firstImport, second.firstImport]).toEqual([true, false]);
  });
});
