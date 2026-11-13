import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

describe('MeetingsDb migrations', () => {
  it('adds the v2 tables to a v1 DB and sets a meta key only once', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const v1 = new MeetingsDb(file);
    v1.upsert(sampleMeeting());
    v1.db.exec('DROP TABLE deleted_meetings; DROP TABLE meta; PRAGMA user_version = 1;');
    v1.close();
    const db = new MeetingsDb(file);
    expect(db.get('meeting-1')?.title).toBe('Roadmap sync');
    expect(db.setMetaOnce('k', 'a')).toBe(true);
    expect(db.setMetaOnce('k', 'b')).toBe(false);
    db.delete('meeting-1');
    expect(db.deletedIds()).toEqual(['meeting-1']);
  });

  it('adds the participants column to a v2 DB and keeps its meetings', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const v2 = new MeetingsDb(file);
    v2.upsert(sampleMeeting());
    v2.db.exec('ALTER TABLE meetings DROP COLUMN participants; PRAGMA user_version = 2;');
    v2.close();
    const db = new MeetingsDb(file);
    expect(db.get('meeting-1')?.participants).toBeNull();
    db.upsert(sampleMeeting({ updatedAt: Date.now(), participants: ['Noor'] }));
    expect(db.get('meeting-1')?.participants).toEqual(['Noor']);
  });

  it('migrates a v4 DB (no low_conf_spans column): old meetings still load, new spans can be saved', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const v4 = new MeetingsDb(file);
    v4.upsert(sampleMeeting());
    v4.db.exec('ALTER TABLE segments DROP COLUMN low_conf_spans; PRAGMA user_version = 4;');
    v4.close();
    const db = new MeetingsDb(file);
    expect(db.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 6 });
    expect(db.get('meeting-1')!.segments.every((s) => s.lowConfSpans === undefined)).toBe(true);
    db.upsert(sampleMeeting({ updatedAt: Date.now(), segments: [{ ...sampleMeeting().segments[0], lowConfSpans: [[0, 2, 0.3]] }] }));
    expect(db.get('meeting-1')!.segments[0].lowConfSpans).toEqual([[0, 2, 0.3]]);
    db.close();
  });

  it('migrates a v5 DB (no insights column): meetings load, insights persist and survive a client upsert', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const v5 = new MeetingsDb(file);
    v5.upsert(sampleMeeting());
    v5.db.exec('ALTER TABLE meetings DROP COLUMN insights; PRAGMA user_version = 5;');
    v5.close();
    const db = new MeetingsDb(file);
    expect(db.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 6 });
    expect(db.get('meeting-1')!.insights).toBeNull();
    const set = { items: [{ id: 'decision:s2:0', kind: 'decision' as const, text: 'We ship the café export on Friday.', segmentId: 's2', speakerId: 'system:1', start: 40, score: 0.7 }], dismissed: [] };
    expect(db.setInsights('meeting-1', set)).toBe(true);
    expect(db.setInsights('nope', set)).toBe(false);
    db.upsert(sampleMeeting({ updatedAt: Date.now(), title: 'Renamed' }));
    expect(db.get('meeting-1')!.insights).toEqual(set);
    db.close();
  });

  it('reads a read-only handle on a pre-v5 DB without the column', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const w = new MeetingsDb(file);
    w.upsert(sampleMeeting());
    w.db.exec('ALTER TABLE segments DROP COLUMN low_conf_spans; PRAGMA user_version = 4;');
    w.close();
    const r = new MeetingsDb(file, { readOnly: true });
    expect(r.get('meeting-1')!.segments).toHaveLength(2);
    r.close();
  });

  it('migrates a v1 DB straight to the current version: meetings kept, participants column and tombstones work', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const v1 = new MeetingsDb(file);
    v1.upsert(sampleMeeting());
    v1.db.exec('DROP TABLE deleted_meetings; DROP TABLE meta; ALTER TABLE meetings DROP COLUMN participants; PRAGMA user_version = 1;');
    v1.close();
    const db = new MeetingsDb(file);
    expect(db.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 6 });
    expect(db.get('meeting-1')?.participants).toBeNull();
    expect(db.search('budget').map((h) => h.id)).toEqual(['meeting-1']);
    db.upsert(sampleMeeting({ updatedAt: Date.now(), participants: ['Noor'] }));
    expect(db.get('meeting-1')?.participants).toEqual(['Noor']);
    db.delete('meeting-1');
    expect(db.upsert(sampleMeeting({ updatedAt: Date.now() + 1 }))).toBe('deleted');
    db.close();
    const again = new MeetingsDb(file);
    expect(again.deletedIds()).toEqual(['meeting-1']);
  });
});
