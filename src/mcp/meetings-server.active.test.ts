import { afterEach, describe, expect, it } from 'vitest';
import { sampleMeeting } from '../lib/meeting-db/test-meeting';
import { connect, removeTempDirs } from './test-client';

afterEach(removeTempDirs);

describe('get_active_meeting', () => {
  it('says clearly that nothing is open when no state exists', async () => {
    const { call } = await connect((db) => db.upsert(sampleMeeting()));
    const res = await call('get_active_meeting');
    expect(res.isError).toBe(false);
    expect(res.text).toMatch(/No meeting is open/);
  });

  it('returns the open meeting as Markdown with is_live', async () => {
    const { call } = await connect((db) => db.upsert(sampleMeeting()), { meetingId: 'meeting-1', isLive: true });
    const res = await call('get_active_meeting');
    expect(res.text).toMatch(/^is_live: true/);
    expect(res.text).toContain(sampleMeeting().title);
  });

  it('reports is_live false for a finished open meeting and handles a meeting without a saved row', async () => {
    const done = await connect((db) => db.upsert(sampleMeeting()), { meetingId: 'meeting-1', isLive: false });
    expect((await done.call('get_active_meeting')).text).toMatch(/^is_live: false/);
    const fresh = await connect(undefined, { meetingId: 'draft-1', isLive: true });
    expect((await fresh.call('get_active_meeting')).text).toMatch(/Meeting database not found|no saved transcript/);
  });

  it('is listed as read-only', async () => {
    const { client } = await connect();
    const tool = (await client.listTools()).tools.find((t) => t.name === 'get_active_meeting');
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });
});
