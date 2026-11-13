import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { MeetingStore } from './store';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

function rawBytes(file: string): string {
  return ['', '-wal', '-shm', '-journal']
    .map((suffix) => (fs.existsSync(file + suffix) ? fs.readFileSync(file + suffix).toString('latin1') : ''))
    .join('\n');
}
const SECRETS = ['café export', 'quarterly budget', 'Freeze the scope', 'release notes', 'Roadmap sync', 'Anna', 'Jens'];

describe('deleting leaves no meeting text on disk', () => {
  function fill(file: string, count = 1): MeetingsDb {
    const db = new MeetingsDb(file);
    for (let i = 0; i < count; i++) db.upsert(sampleMeeting({ id: `meeting-${i + 1}` }), { markdownFile: `m${i}.md` });
    return db;
  }

  it('delete(): DB, WAL and free pages hold no transcript, title, summary or speaker name', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const db = fill(file);
    expect(rawBytes(file)).toContain('quarterly budget');
    db.delete('meeting-1', 123);
    const bytes = rawBytes(file);
    for (const s of SECRETS) expect(bytes, s).not.toContain(s);
    expect(db.db.prepare('SELECT * FROM deleted_meetings').all()).toEqual([{ id: 'meeting-1', deleted_at: 123 }]);
    db.close();
    for (const s of SECRETS) expect(rawBytes(file), s).not.toContain(s);
  });

  it('delete() of one meeting keeps the other searchable', () => {
    const db = fill(path.join(tmpDir(), 'meetings.db'), 2);
    db.delete('meeting-1');
    expect(db.search('quarterly').map((h) => h.id)).toEqual(['meeting-2']);
  });

  it('deleteAll(): everything gone, ids tombstoned, returns Markdown files', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const db = fill(file, 3);
    const { count, markdownFiles } = db.deleteAll(5);
    expect(count).toBe(3);
    expect(markdownFiles.sort()).toEqual(['m0.md', 'm1.md', 'm2.md']);
    expect(db.list()).toEqual([]);
    for (const s of SECRETS) expect(rawBytes(file), s).not.toContain(s);
    db.close();
    for (const s of SECRETS) expect(rawBytes(file), s).not.toContain(s);
  });

  it('clearing a transcript (re-save without lines) scrubs the old text', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const db = fill(file);
    db.upsert(sampleMeeting({ updatedAt: Date.UTC(2026, 10, 3, 11, 0), segments: [], speakers: {}, notes: { actions: [], decisions: [] }, participants: null, title: 'Untitled' }));
    const bytes = rawBytes(file);
    for (const s of ['café export', 'quarterly budget', 'Freeze the scope', 'release notes', 'Anna', 'Jens']) {
      expect(bytes, s).not.toContain(s);
    }
  });

  it('renaming or editing notes/participants scrubs the old text from the WAL', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const db = fill(file);
    db.upsert(sampleMeeting({ updatedAt: Date.UTC(2026, 10, 3, 10, 30), participants: ['Marieke'] }));
    expect(rawBytes(file)).toContain('Marieke');
    db.upsert(sampleMeeting({ updatedAt: Date.UTC(2026, 10, 3, 11, 0), title: 'Renamed', participants: ['Zed'], notes: { actions: [], decisions: [] } }));
    const bytes = rawBytes(file);
    for (const s of ['Roadmap sync', 'Marieke', 'Freeze the scope']) expect(bytes, s).not.toContain(s);
  });

  it('MeetingStore.delete removes the Markdown file and its text', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    store.save(sampleMeeting());
    store.save(sampleMeeting({ id: 'two' }));
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toHaveLength(2);
    store.deleteAll();
    expect(fs.readdirSync(path.join(dir, 'meetings'))).toEqual([]);
    for (const s of SECRETS) expect(rawBytes(path.join(dir, 'meetings.db')), s).not.toContain(s);
  });
});
