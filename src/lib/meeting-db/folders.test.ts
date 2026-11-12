import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FolderError, MeetingsDb } from './db';
import { MeetingStore } from './store';
import { sampleMeeting } from './test-meeting';

const dirs: string[] = [];
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'folders-db-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});
const openDb = () => new MeetingsDb(path.join(tmpDir(), 'meetings.db'));
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof FolderError ? e.code : 'other';
  }
  return 'none';
};

describe('folders', () => {
  it('creates, renames and lists in sibling order; rejects bad names and parents', () => {
    const db = openDb();
    const a = db.createFolder('  A  ');
    const b = db.createFolder('B', a.id);
    const c = db.createFolder('C', a.id);
    expect(a.name).toBe('A');
    expect(db.renameFolder(c.id, 'C2').name).toBe('C2');
    expect(db.listFolders().map((f) => [f.name, f.parentId])).toEqual([['A', null], ['B', a.id], ['C2', a.id]]);
    expect(b.sort).toBeLessThan(c.sort);
    expect(code(() => db.createFolder('  '))).toBe('bad-name');
    expect(code(() => db.createFolder('x', 'nope'))).toBe('bad-parent');
    expect(code(() => db.renameFolder('nope', 'x'))).toBe('not-found');
  });

  it('moves folders and rejects cycles and missing parents', () => {
    const db = openDb();
    const a = db.createFolder('A');
    const b = db.createFolder('B', a.id);
    const c = db.createFolder('C', b.id);
    expect(code(() => db.moveFolder(a.id, a.id))).toBe('cycle');
    expect(code(() => db.moveFolder(a.id, c.id))).toBe('cycle');
    expect(code(() => db.moveFolder(c.id, 'nope'))).toBe('bad-parent');
    expect(db.moveFolder(c.id, null).parentId).toBeNull();
    expect(db.moveFolder(a.id, c.id).parentId).toBe(c.id);
  });

  it('files meetings, keeps the filing on a PUT without folderId, and unfiles on null', () => {
    const db = openDb();
    const f = db.createFolder('F');
    db.upsert(sampleMeeting());
    expect(db.get('meeting-1')!.folderId).toBeNull();
    db.moveMeeting('meeting-1', f.id);
    expect(db.get('meeting-1')!.folderId).toBe(f.id);
    expect(db.list()[0].folderId).toBe(f.id);
    db.upsert(sampleMeeting({ updatedAt: Date.now() + 10_000 }));
    expect(db.get('meeting-1')!.folderId).toBe(f.id);
    db.upsert(sampleMeeting({ updatedAt: Date.now() + 20_000, folderId: null }));
    expect(db.get('meeting-1')!.folderId).toBeNull();
    db.upsert(sampleMeeting({ updatedAt: Date.now() + 30_000, folderId: 'ghost' }));
    expect(db.get('meeting-1')!.folderId).toBeNull();
    expect(code(() => db.moveMeeting('nope', f.id))).toBe('not-found');
    expect(code(() => db.moveMeeting('meeting-1', 'ghost'))).toBe('bad-parent');
  });

  it('move-up hands subfolders and meetings to the parent', () => {
    const db = openDb();
    const a = db.createFolder('A');
    const b = db.createFolder('B', a.id);
    const c = db.createFolder('C', b.id);
    db.upsert(sampleMeeting());
    db.moveMeeting('meeting-1', b.id);
    db.deleteFolder(b.id, 'move-up');
    expect(db.listFolders().map((f) => f.id).sort()).toEqual([a.id, c.id].sort());
    expect(db.listFolders().find((f) => f.id === c.id)!.parentId).toBe(a.id);
    expect(db.get('meeting-1')!.folderId).toBe(a.id);
    db.deleteFolder(a.id, 'move-up');
    expect(db.get('meeting-1')!.folderId).toBeNull();
    expect(db.listFolders()[0].parentId).toBeNull();
  });

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

  it('migrates a v3 database', () => {
    const dir = tmpDir();
    const file = path.join(dir, 'meetings.db');
    const first = new MeetingsDb(file);
    first.db.exec('DROP TABLE folders; ALTER TABLE meetings DROP COLUMN folder_id; PRAGMA user_version = 3');
    first.close();
    const db = new MeetingsDb(file);
    expect(db.createFolder('X').name).toBe('X');
    db.upsert(sampleMeeting());
    expect(db.get('meeting-1')!.folderId).toBeNull();
  });
});
