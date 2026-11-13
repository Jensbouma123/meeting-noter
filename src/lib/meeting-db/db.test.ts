import { describe, expect, it } from 'vitest';
import { ftsQuery } from './fts-query';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { openDb } = registerTempDirs();

describe('MeetingsDb', () => {
  it('round-trips a meeting with its segments in time order, speakers and notes', () => {
    const db = openDb();
    expect(db.upsert(sampleMeeting())).toBe('written');
    const got = db.get('meeting-1')!;
    expect(got.title).toBe('Roadmap sync');
    expect(got.segments.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(got.speakers['system:1'].label).toBe('Anna');
    expect(got.notes.actions[0].ownerName).toBe('Anna');
    expect(got.captureMode).toBe('both');
    expect(db.get('nope')).toBeNull();
  });

  it('lists newest first with speaker names and line counts', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    db.upsert(sampleMeeting({ id: 'meeting-2', title: 'Later', startedAt: Date.UTC(2026, 10, 4), segments: [] }));
    const list = db.list();
    expect(list.map((m) => m.id)).toEqual(['meeting-2', 'meeting-1']);
    expect(list[1]).toMatchObject({ segmentCount: 2, speakers: ['Jens', 'Anna'] });
  });

  it('searches transcript, summary and title, ignoring accents and case', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    db.upsert(sampleMeeting({ id: 'other', title: 'Hiring', segments: [], notes: { actions: [], decisions: [] } }));
    expect(db.search('CAFE export').map((h) => h.id)).toEqual(['meeting-1']);
    expect(db.search('release notes').map((h) => h.id)).toEqual(['meeting-1']);
    expect(db.search('hiring').map((h) => h.id)).toEqual(['other']);
    expect(db.search('budg')[0].snippet).toContain('[budget]');
    expect(db.search('nothing-matches-this')).toEqual([]);
  });

  it('treats FTS operators in the query as plain words', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    expect(() => db.search('budget AND -( "')).not.toThrow();
    expect(ftsQuery('a "b" OR c')).toBe('"a"* "b"* "OR"* "c"*');
    expect(ftsQuery('  -- ')).toBeNull();
  });

  it('keeps the newer copy and replaces the transcript on update', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    const older = sampleMeeting({ title: 'Old title', updatedAt: 1 });
    expect(db.upsert(older)).toBe('stale');
    const newer = sampleMeeting({
      title: 'Renamed',
      updatedAt: Date.now(),
      segments: [{ id: 'x', source: 'mic', speaker: 'mic:0', text: 'Only line', start: 0, end: 1 }],
    });
    expect(db.upsert(newer)).toBe('written');
    expect(db.get('meeting-1')!.segments).toHaveLength(1);
    expect(db.search('quarterly')).toEqual([]);
    expect(db.search('renamed').map((h) => h.id)).toEqual(['meeting-1']);
  });

  it('onlyIfNewer skips an equal copy, so a re-import changes nothing', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    expect(db.upsert(sampleMeeting(), { onlyIfNewer: true })).toBe('stale');
    expect(db.upsert(sampleMeeting())).toBe('written');
  });

  it('deletes a meeting with its lines, speakers and index row', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    expect(db.delete('meeting-1').deleted).toBe(true);
    expect(db.get('meeting-1')).toBeNull();
    expect(db.search('budget')).toEqual([]);
    expect(db.db.prepare('SELECT COUNT(*) AS n FROM segments').get()!.n).toBe(0);
    expect(db.delete('meeting-1').deleted).toBe(false);
  });

  it('never stores a deleted meeting again, even a newer copy', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    db.delete('meeting-1');
    expect(db.upsert(sampleMeeting({ updatedAt: Date.now() }))).toBe('deleted');
    expect(db.get('meeting-1')).toBeNull();
    expect(db.deletedIds()).toEqual(['meeting-1']);
  });

  it('round-trips participants, keeps null apart from an empty list and searches their names', () => {
    const db = openDb();
    db.upsert(sampleMeeting({ participants: ['Marieke', 'Joost'] }));
    db.upsert(sampleMeeting({ id: 'never-asked', participants: null }));
    db.upsert(sampleMeeting({ id: 'skipped', participants: [] }));
    expect(db.get('meeting-1')?.participants).toEqual(['Marieke', 'Joost']);
    expect(db.get('never-asked')?.participants).toBeNull();
    expect(db.get('skipped')?.participants).toEqual([]);
    expect(db.search('Joost').map((h) => h.id)).toEqual(['meeting-1']);
  });

  it('round-trips lowConfSpans per segment; segments without them read back without the field', () => {
    const db = openDb();
    const base = sampleMeeting();
    db.upsert(sampleMeeting({ segments: [{ ...base.segments[0], lowConfSpans: [[3, 9, 0.41], [12, 15, 0.5]] }, base.segments[1]] }));
    const got = db.get('meeting-1')!;
    expect(got.segments.find((s) => s.id === 's2')?.lowConfSpans).toEqual([[3, 9, 0.41], [12, 15, 0.5]]);
    expect('lowConfSpans' in got.segments.find((s) => s.id === 's1')!).toBe(false);
  });

  it('after deleteAll a stale or newer copy of any deleted meeting is refused, other ids still store', () => {
    const db = openDb();
    db.upsert(sampleMeeting());
    db.upsert(sampleMeeting({ id: 'two' }));
    db.deleteAll();
    expect(db.upsert(sampleMeeting({ updatedAt: Date.now() + 1000 }))).toBe('deleted');
    expect(db.upsert(sampleMeeting({ id: 'two' }), { onlyIfNewer: true })).toBe('deleted');
    expect(db.upsert(sampleMeeting({ id: 'three' }))).toBe('written');
    expect(db.list().map((m) => m.id)).toEqual(['three']);
    expect(db.deletedIds().sort()).toEqual(['meeting-1', 'two']);
  });
});
