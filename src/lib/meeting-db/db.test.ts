import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MeetingsDb, ftsQuery } from './db';
import { MeetingStore } from './store';
import { parseStoredMeeting } from './validate';
import { markdownFileName } from './markdown';
import { sampleMeeting } from './test-meeting';

const dirs: string[] = [];
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetings-db-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function openDb(): MeetingsDb {
  return new MeetingsDb(path.join(tmpDir(), 'meetings.db'));
}

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

  it('opens read-only alongside a writer and sees its commits', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const writer = new MeetingsDb(file);
    const reader = new MeetingsDb(file, { readOnly: true });
    writer.upsert(sampleMeeting());
    expect(reader.search('budget').map((h) => h.id)).toEqual(['meeting-1']);
    expect(() => reader.db.exec('DELETE FROM meetings')).toThrow();
  });
});

describe('MeetingStore', () => {
  it('writes one Markdown file per meeting and moves it on rename', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    store.save(sampleMeeting());
    const first = path.join(dir, 'meetings', markdownFileName(sampleMeeting()));
    const md = fs.readFileSync(first, 'utf8');
    expect(md).toMatch(/^# Roadmap sync\n/);
    expect(md).toContain('## Speakers\n\n- Jens\n- Anna');
    expect(md).toContain('- [ ] Draft the release notes (Anna)');
    expect(md).toContain('[00:02] Jens: Let us look at the quarterly budget.');
    expect(md.indexOf('[00:02]')).toBeLessThan(md.indexOf('[00:40]'));

    const renamed = sampleMeeting({ title: 'Budget review', updatedAt: Date.now() });
    store.save(renamed);
    expect(fs.existsSync(first)).toBe(false);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toEqual([markdownFileName(renamed)]);

    expect(store.delete('meeting-1')).toBe(true);
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toEqual([]);
  });

  it('writes no file for a draft', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    store.save(sampleMeeting({ isDraft: true, segments: [] }));
    expect(fs.existsSync(path.join(dir, 'meetings'))).toBe(false);
  });
});

describe('parseStoredMeeting', () => {
  it('drops partial and malformed lines but keeps the meeting', () => {
    const raw = {
      ...sampleMeeting(),
      segments: [
        { id: 'p', source: 'mic', speaker: 'mic:0', text: 'partial', start: 0, end: 1, final: false },
        { id: 'f', source: 'mic', speaker: 'mic:0', text: 'final', start: 1, end: 2, final: true, words: [] },
        { id: 'bad', source: 'radio', speaker: 'x', text: 'y', start: 0, end: 1 },
      ],
    };
    const parsed = parseStoredMeeting(raw)!;
    expect(parsed.segments.map((s) => s.id)).toEqual(['f']);
    expect(parsed.segments[0]).not.toHaveProperty('words');
  });

  it('refuses ids that are unsafe in a path and missing timestamps', () => {
    expect(parseStoredMeeting({ ...sampleMeeting(), id: '../etc' })).toBeNull();
    expect(parseStoredMeeting({ ...sampleMeeting(), updatedAt: 'now' })).toBeNull();
    expect(parseStoredMeeting(null)).toBeNull();
  });
});
