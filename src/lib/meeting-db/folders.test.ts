import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { FolderError } from './folder-error';
import { sampleMeeting } from './test-meeting';
import { registerTempDirs } from './test-support';

const { tmpDir, openDb } = registerTempDirs();
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

  it('stores a per-folder roster with inheritance on by default', () => {
    const db = openDb();
    const parent = db.createFolder('Parent');
    const child = db.createFolder('Child', parent.id);
    expect(parent.roster).toEqual([]);
    expect(parent.inheritRoster).toBe(true);
    const saved = db.setFolderRoster(parent.id, ['Anna', 'Piet'], false);
    expect(saved.roster).toEqual(['Anna', 'Piet']);
    expect(saved.inheritRoster).toBe(false);
    expect(db.listFolders().find((f) => f.id === child.id)!.roster).toEqual([]);
    expect(db.listFolders().find((f) => f.id === child.id)!.inheritRoster).toBe(true);
    const overriding = db.setFolderRoster(child.id, ['Sam'], false);
    expect(overriding.roster).toEqual(['Sam']);
    expect(db.listFolders().find((f) => f.id === parent.id)!.roster).toEqual(['Anna', 'Piet']);
    expect(code(() => db.setFolderRoster('nope', ['Sam'], false))).toBe('not-found');
  });

  it('migrates a folders table without roster columns to inherit', () => {
    const file = path.join(tmpDir(), 'roster-v7.db');
    const first = new MeetingsDb(file);
    first.db.exec('ALTER TABLE folders DROP COLUMN roster; ALTER TABLE folders DROP COLUMN roster_inherit; PRAGMA user_version = 7');
    first.close();
    const db = new MeetingsDb(file);
    const folder = db.createFolder('X');
    expect(folder.roster).toEqual([]);
    expect(folder.inheritRoster).toBe(true);
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
