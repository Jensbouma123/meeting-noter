import { afterEach, describe, expect, it } from 'vitest';
import { sampleMeeting } from '../lib/meeting-db/test-meeting';
import { connect, removeTempDirs } from './test-client';

afterEach(removeTempDirs);

describe('meetings MCP server read tools', () => {
  it('list_meetings returns id, title, ISO date and speakers, newest first, without drafts, with paging', async () => {
    const { call } = await connect((db) => {
      db.upsert(sampleMeeting());
      db.upsert(sampleMeeting({ id: 'later', title: 'Later', startedAt: Date.UTC(2026, 10, 5) }));
      db.upsert(sampleMeeting({ id: 'draft', title: 'Draft', startedAt: Date.UTC(2026, 10, 6), isDraft: true, segments: [] }));
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
});
