import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

describe('MeetingsDb read-only handle', () => {
  it('refuses every write path and leaves an old DB unmigrated', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const writer = new MeetingsDb(file);
    writer.upsert(sampleMeeting());
    writer.db.exec('PRAGMA user_version = 2');
    writer.close();
    const reader = new MeetingsDb(file, { readOnly: true });
    expect(() => reader.upsert(sampleMeeting({ updatedAt: Date.now() }))).toThrow();
    expect(() => reader.delete('meeting-1')).toThrow();
    expect(() => reader.deleteAll()).toThrow();
    expect(() => reader.setMetaOnce('k', 'v')).toThrow();
    expect(reader.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 });
    expect(reader.get('meeting-1')?.title).toBe('Roadmap sync');
    reader.close();
  });

  it('opens alongside a writer and sees its commits', () => {
    const file = path.join(tmpDir(), 'meetings.db');
    const writer = new MeetingsDb(file);
    const reader = new MeetingsDb(file, { readOnly: true });
    writer.upsert(sampleMeeting());
    expect(reader.search('budget').map((h) => h.id)).toEqual(['meeting-1']);
    expect(() => reader.db.exec('DELETE FROM meetings')).toThrow();
  });
});
