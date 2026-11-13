import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET, PUT } from './route';

let dir = '';
const env = process.env as Record<string, string | undefined>;
const prevDir = env.MEETING_NOTER_DATA_DIR;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'active-meeting-'));
  env.MEETING_NOTER_DATA_DIR = dir;
});
afterEach(() => {
  if (prevDir === undefined) delete env.MEETING_NOTER_DATA_DIR;
  else env.MEETING_NOTER_DATA_DIR = prevDir;
  fs.rmSync(dir, { recursive: true, force: true });
});

const LOCAL = { host: 'localhost:3000', 'content-type': 'application/json' };
const req = (method: string, body?: unknown, headers: Record<string, string> = LOCAL) =>
  new Request('http://localhost:3000/api/active-meeting', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('/api/active-meeting', () => {
  it('starts with no active meeting, stores and clears state', async () => {
    expect(await (await GET(req('GET'))).json()).toEqual({ meetingId: null, isLive: false });
    const put = await PUT(req('PUT', { meetingId: 'm-1', isLive: true }));
    expect(put.status).toBe(200);
    expect(await (await GET(req('GET'))).json()).toEqual({ meetingId: 'm-1', isLive: true });
    await PUT(req('PUT', { meetingId: null, isLive: true }));
    expect(await (await GET(req('GET'))).json()).toEqual({ meetingId: null, isLive: false });
  });

  it('rejects bad bodies and foreign hosts', async () => {
    expect((await PUT(req('PUT', { meetingId: '../x', isLive: true }))).status).toBe(400);
    expect((await PUT(req('PUT', { meetingId: 'm-1', isLive: 'yes' }))).status).toBe(400);
    expect((await PUT(req('PUT', { meetingId: 'm-1', isLive: true }, { host: 'evil.example:3000' }))).status).toBe(403);
    expect((await GET(req('GET', undefined, { host: 'evil.example:3000' }))).status).toBe(403);
  });
});
