import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { markdownFileName } from './markdown';
import { MeetingStore } from './meeting-store';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

describe('MeetingStore', () => {
  it('writes one Markdown file per meeting and moves it on rename', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    store.save(sampleMeeting());
    const first = path.join(dir, 'meetings', markdownFileName(sampleMeeting()));
    const md = fs.readFileSync(first, 'utf8');
    expect(md).toMatch(/^# Roadmap sync\n/);
    expect(md).toContain('## Participants\n\n- Jens\n- Anna\n\n## Speakers\n\n- Jens\n- Anna');
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
