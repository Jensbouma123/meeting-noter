import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { markdownFolderPath } from './markdown';
import { MeetingStore } from './store';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

describe('folders and Markdown files', () => {
  it('delete-contents removes meetings like a meeting delete: remembered, files gone, text scrubbed', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    const a = store.db.createFolder('A');
    const b = store.db.createFolder('B', a.id);
    store.save(sampleMeeting());
    store.save(sampleMeeting({ id: 'meeting-2', title: 'Other', segments: [] }));
    store.db.moveMeeting('meeting-1', b.id);
    const file = store.db.markdownFile('meeting-1')!;
    expect(fs.existsSync(path.join(dir, 'meetings', file))).toBe(true);
    expect(store.deleteFolder(a.id, 'delete-contents')).toEqual({ folders: 2, meetings: 1 });
    expect(store.db.get('meeting-1')).toBeNull();
    expect(store.db.get('meeting-2')).not.toBeNull();
    expect(store.db.deletedIds()).toContain('meeting-1');
    expect(store.db.listFolders()).toEqual([]);
    expect(fs.existsSync(path.join(dir, 'meetings', file))).toBe(false);
    expect(store.save(sampleMeeting())).toBe('deleted');
    expect(store.db.search('budget')).toEqual([]);
    expect(fs.readFileSync(path.join(dir, 'meetings.db')).includes('quarterly budget')).toBe(false);
  });

  it('mirrors folder names and moves meeting Markdown files with safe paths', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    const parent = store.createFolder('../Planning');
    const child = store.createFolder('Weekly sync', parent.id);
    store.save(sampleMeeting());
    store.moveMeeting('meeting-1', child.id);
    const oldPath = path.join(dir, 'meetings', markdownFolderPath(store.db.listFolders(), child.id), store.db.markdownFile('meeting-1')!.split('/').at(-1)!);
    expect(path.relative(path.join(dir, 'meetings'), oldPath).startsWith('..')).toBe(false);
    expect(fs.existsSync(oldPath)).toBe(true);

    store.renameFolder(parent.id, 'Roadmap');
    const renamedPath = path.join(dir, 'meetings', markdownFolderPath(store.db.listFolders(), child.id), store.db.markdownFile('meeting-1')!.split('/').at(-1)!);
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(renamedPath)).toBe(true);
    expect(path.relative(path.join(dir, 'meetings'), renamedPath).startsWith('..')).toBe(false);
    store.moveMeeting('meeting-1', null);
    expect(fs.existsSync(renamedPath)).toBe(false);
    expect(fs.existsSync(path.join(dir, 'meetings', store.db.markdownFile('meeting-1')!))).toBe(true);
  });

  it('moves markdown files when a folder itself moves and keeps traversal names inside the root', () => {
    const dir = tmpDir();
    const store = new MeetingStore(new MeetingsDb(path.join(dir, 'meetings.db')), path.join(dir, 'meetings'));
    const a = store.createFolder('../../outside');
    const b = store.createFolder('B');
    const child = store.createFolder('child', a.id);
    store.save(sampleMeeting());
    store.moveMeeting('meeting-1', child.id);
    const markdown = store.db.markdownFile('meeting-1')!;
    const root = path.resolve(dir, 'meetings');
    const before = path.resolve(root, markdown);
    expect(path.relative(root, before).startsWith('..')).toBe(false);
    expect(fs.existsSync(before)).toBe(true);

    store.moveFolder(a.id, b.id);
    const after = path.resolve(root, store.db.markdownFile('meeting-1')!);
    expect(after).not.toBe(before);
    expect(path.relative(root, after).startsWith('..')).toBe(false);
    expect(fs.existsSync(before)).toBe(false);
    expect(fs.existsSync(after)).toBe(true);
  });
});
