import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_MEETING_BODY_BYTES } from '@/lib/meeting-db/http';
import { markdownFileName } from '@/lib/meeting-db/markdown';
import { sampleMeeting } from '@/lib/meeting-db/test-meeting';
import { DELETE as removeAll, GET as list } from './route';
import { DELETE as remove, GET as get, PUT as put } from './[id]/route';
import { POST as importMeetings } from './import/route';

/** Guards of the /api/meetings routes: Host/Origin, ids, body size and shape, path escape. */

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-guards-'));
  env.MEETING_NOTER_DATA_DIR = dir;
});
afterEach(() => {
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const LOCAL = { host: 'localhost:3000' };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (method: string, p: string, headers: Record<string, string>, body?: string) =>
  new Request(`http://localhost:3000/api/meetings${p}`, { method, headers, body });
const files = () => fs.readdirSync(dir).filter((f) => f !== 'meetings.db' && !f.startsWith('meetings.db-'));

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
      (await list(request('GET', '', headers))).status,
      (await removeAll(request('DELETE', '', headers))).status,
      (await get(request('GET', `/${m.id}`, headers), ctx(m.id))).status,
      (await put(request('PUT', `/${m.id}`, json, body), ctx(m.id))).status,
      (await remove(request('DELETE', `/${m.id}`, headers), ctx(m.id))).status,
      (await importMeetings(request('POST', '/import', json, JSON.stringify({ meetings: [m] })))).status,
    ];
    expect(statuses).toEqual([403, 403, 403, 403, 403, 403]);
    // Nothing was created: not even the DB.
    expect(files()).toEqual([]);
    expect(fs.existsSync(path.join(dir, 'meetings.db'))).toBe(false);
  });

  it('a text/plain cross-site "simple" PUT is refused by its Origin, nothing is stored', async () => {
    const res = await put(
      request('PUT', `/${m.id}`, { ...LOCAL, origin: 'https://evil.example', 'content-type': 'text/plain' }, body),
      ctx(m.id),
    );
    expect(res.status).toBe(403);
    expect(fs.existsSync(path.join(dir, 'meetings.db'))).toBe(false);
  });
});

describe('meeting ids never reach a path', () => {
  const bad = ['..', '../x', '..%2Fx', 'a/b', 'a\\b', '/etc/passwd', 'C:\\x', 'a\0b', 'a b', '.', '', 'x'.repeat(101), 'é'];
  it.each(bad)('GET and DELETE answer 400 for %j', async (id) => {
    expect((await get(request('GET', '/x', LOCAL), ctx(id))).status).toBe(400);
    expect((await remove(request('DELETE', '/x', LOCAL), ctx(id))).status).toBe(400);
  });

  it.each(bad.filter((id) => id !== ''))('PUT refuses id %j even when the body carries the same id', async (id) => {
    const res = await put(
      request('PUT', '/x', { ...LOCAL, 'content-type': 'application/json' }, JSON.stringify(sampleMeeting({ id }))),
      ctx(id),
    );
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(dir, 'meetings'))).toBe(false);
  });

  it('a hostile title cannot move the Markdown file out of meetings/', async () => {
    const title = '../../../../etc/passwd\0/..\\..\\evil';
    const m = sampleMeeting({ title });
    expect(markdownFileName(m)).toMatch(/^[a-z0-9-]+\.md$/);
    const res = await put(
      request('PUT', `/${m.id}`, { ...LOCAL, 'content-type': 'application/json' }, JSON.stringify(m)),
      ctx(m.id),
    );
    expect(res.status).toBe(200);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toHaveLength(1);
    expect(files().sort()).toEqual(['meetings']);
  });
});

describe('body checks', () => {
  const put1 = (headers: Record<string, string>, body: string) => {
    const m = sampleMeeting();
    return put(request('PUT', `/${m.id}`, { ...LOCAL, ...headers }, body), ctx(m.id));
  };
  it('rejects a declared oversize body with 413', async () => {
    expect((await put1({ 'content-length': String(MAX_MEETING_BODY_BYTES + 1) }, '{}')).status).toBe(413);
  });

  it('rejects a chunked oversize body with 413 while streaming it', async () => {
    const m = sampleMeeting();
    const chunk = 'x'.repeat(1_000_000);
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode(chunk));
      },
    });
    const res = await put(
      new Request(`http://localhost:3000/api/meetings/${m.id}`, {
        method: 'PUT',
        headers: { ...LOCAL, 'content-type': 'application/json' },
        body,
        duplex: 'half',
      } as RequestInit),
      ctx(m.id),
    );
    expect(res.status).toBe(413);
    expect(files()).toEqual([]);
  });

  it('rejects malformed JSON and non-objects with 400', async () => {
    expect((await put1({}, '{not json')).status).toBe(400);
    expect((await put1({}, 'null')).status).toBe(400);
    expect((await put1({}, '[]')).status).toBe(400);
    expect((await put1({}, JSON.stringify({ id: 'meeting-1' }))).status).toBe(400);
  });

  it('import refuses a non-array, malformed JSON and an oversize declared body', async () => {
    const post = (headers: Record<string, string>, body: string) =>
      importMeetings(request('POST', '/import', { ...LOCAL, ...headers }, body));
    expect((await post({}, JSON.stringify({ meetings: 'x' }))).status).toBe(400);
    expect((await post({}, 'nope')).status).toBe(400);
    expect((await post({}, JSON.stringify([]))).status).toBe(400);
    expect((await post({ 'content-length': '200000001' }, JSON.stringify({ meetings: [] }))).status).toBe(413);
  });

  it('import counts hostile ids as invalid and writes nothing for them', async () => {
    const good = sampleMeeting();
    const res = await importMeetings(
      request('POST', '/import', LOCAL, JSON.stringify({ meetings: [{ ...good, id: '../evil' }, { ...good, id: 'a/b' }, good] })),
    );
    expect(await res.json()).toMatchObject({ imported: 1, invalid: 2 });
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toHaveLength(1);
  });

  it('storage errors do not leak the data dir path in the message', async () => {
    env.MEETING_NOTER_DATA_DIR = path.join(dir, 'file-not-dir', 'x');
    fs.writeFileSync(path.join(dir, 'file-not-dir'), '');
    const res = await list(request('GET', '', LOCAL));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: 'storage-unavailable' });
  });
});
