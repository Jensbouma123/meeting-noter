import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { MeetingsDb } from '../lib/meeting-db/db';
import { sampleMeeting } from '../lib/meeting-db/test-meeting';
import { connect, removeTempDirs } from './test-client';

afterEach(removeTempDirs);

describe('meetings MCP server read-only guarantees', () => {
  it('refuses to call a write tool and leaves the DB bytes untouched after every read tool ran', async () => {
    const { client, call, file } = await connect((db) => db.upsert(sampleMeeting()));
    const before = fs.readFileSync(file);
    for (const name of ['delete_meeting', 'save_meeting', 'update_meeting', 'delete_all']) {
      await expect(client.callTool({ name, arguments: { id: 'meeting-1' } })).resolves.toMatchObject({ isError: true });
    }
    await call('list_meetings');
    await call('search_meetings', { query: 'budget' });
    await call('get_meeting', { id: 'meeting-1' });
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    expect(fs.existsSync(`${file}-wal`) ? fs.statSync(`${file}-wal`).size : 0).toBe(0);
    const reader = new MeetingsDb(file);
    expect(reader.get('meeting-1')).not.toBeNull();
  });

  it('does not return a meeting deleted from the DB', async () => {
    const { call, file } = await connect((db) => db.upsert(sampleMeeting()));
    const writer = new MeetingsDb(file);
    writer.delete('meeting-1');
    writer.close();
    expect((await call('get_meeting', { id: 'meeting-1' })).isError).toBe(true);
    expect((await call('search_meetings', { query: 'budget' })).text).toMatch(/No meetings match/);
  });

  it('cannot change the DB: it is opened read-only', async () => {
    const { file } = await connect((db) => db.upsert(sampleMeeting()));
    const reader = new MeetingsDb(file, { readOnly: true });
    expect(() => reader.db.exec("UPDATE meetings SET title = 'x'")).toThrow(/readonly/i);
    reader.close();
  });
});
