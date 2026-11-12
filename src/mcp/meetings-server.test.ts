import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { MeetingsDb } from '../lib/meeting-db/db';
import { sampleMeeting } from '../lib/meeting-db/test-meeting';
import { createMeetingsMcpServer } from './meetings-server';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A client connected to a server over a DB file seeded by `seed`. */
async function connect(seed?: (db: MeetingsDb) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-mcp-'));
  dirs.push(dir);
  const file = path.join(dir, 'meetings.db');
  if (seed) {
    const writer = new MeetingsDb(file);
    seed(writer);
    writer.close();
  }
  const server = createMeetingsMcpServer(() => (fs.existsSync(file) ? new MeetingsDb(file, { readOnly: true }) : null));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientSide);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { text: res.content[0].text, isError: res.isError === true };
  };
  return { client, call, file };
}

describe('meetings MCP server', () => {
  it('offers exactly the three read-only tools', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_meeting', 'list_meetings', 'search_meetings']);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it('says there are no meetings when the DB does not exist yet', async () => {
    const { call } = await connect();
    const res = await call('list_meetings');
    expect(res.isError).toBe(false);
    expect(res.text).toMatch(/No meetings saved yet/);
  });

  it('list_meetings returns id, title, ISO date and speakers, newest first, with paging', async () => {
    const { call } = await connect((db) => {
      db.upsert(sampleMeeting());
      db.upsert(sampleMeeting({ id: 'later', title: 'Later', startedAt: Date.UTC(2026, 10, 5) }));
    });
    const all = JSON.parse((await call('list_meetings')).text);
    expect(all.map((m: { id: string }) => m.id)).toEqual(['later', 'meeting-1']);
    expect(all[1]).toMatchObject({
      title: 'Roadmap sync',
      date: '2026-11-03T09:00:00.000Z',
      speakers: ['Jens', 'Anna'],
      lines: 2,
    });
    const page = JSON.parse((await call('list_meetings', { limit: 1, offset: 1 })).text);
    expect(page.map((m: { id: string }) => m.id)).toEqual(['meeting-1']);
  });

  it('search_meetings finds transcript words and marks them in the snippet', async () => {
    const { call } = await connect((db) => db.upsert(sampleMeeting()));
    const hits = JSON.parse((await call('search_meetings', { query: 'quarterly budget' })).text);
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('meeting-1');
    expect(hits[0].snippet).toContain('[quarterly] [budget]');
    expect((await call('search_meetings', { query: 'zeppelin' })).text).toMatch(/No meetings match/);
  });

  it('get_meeting returns the Markdown by default and the raw meeting as json', async () => {
    const { call } = await connect((db) => db.upsert(sampleMeeting()));
    const md = (await call('get_meeting', { id: 'meeting-1' })).text;
    expect(md).toMatch(/^# Roadmap sync/);
    expect(md).toContain('[00:40] Anna: We ship the café export on Friday.');
    expect(md).toContain('- Freeze the scope');
    const json = JSON.parse((await call('get_meeting', { id: 'meeting-1', format: 'json' })).text);
    expect(json.segments).toHaveLength(2);
    expect(json.speakers['mic:0'].label).toBe('Jens');
    const missing = await call('get_meeting', { id: 'nope' });
    expect(missing.isError).toBe(true);
  });

  it('cannot change the DB: it is opened read-only', async () => {
    const { file } = await connect((db) => db.upsert(sampleMeeting()));
    const reader = new MeetingsDb(file, { readOnly: true });
    expect(() => reader.db.exec("UPDATE meetings SET title = 'x'")).toThrow(/readonly/i);
    reader.close();
  });
});
