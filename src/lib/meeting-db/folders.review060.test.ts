import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MeetingsDb } from './db';
import { FolderError } from './folder-error';
import { registerTempDirs } from './test-support';

const { tmpDir } = registerTempDirs();

describe('folder context migration v8 -> v9 (review060)', () => {
  it('upgrades a v8 database with folders and rosters, keeping them and defaulting context to empty', () => {
    const file = path.join(tmpDir(), 'v8.db');
    const first = new MeetingsDb(file);
    const parent = first.createFolder('Team');
    const child = first.createFolder('Q1', parent.id);
    first.setFolderRoster(child.id, ['Anna'], false);
    first.db.exec('ALTER TABLE folders DROP COLUMN context; PRAGMA user_version = 8');
    first.close();

    const db = new MeetingsDb(file);
    expect(db.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 9 });
    const folders = db.listFolders();
    expect(folders.map((f) => [f.name, f.parentId, f.context]).sort()).toEqual([
      ['Q1', parent.id, ''],
      ['Team', null, ''],
    ]);
    expect(folders.find((f) => f.id === child.id)!.roster).toEqual(['Anna']);
    expect(folders.find((f) => f.id === child.id)!.inheritRoster).toBe(false);
    db.close();
  });

  it('is idempotent: reopening a migrated database keeps stored context', () => {
    const file = path.join(tmpDir(), 'reopen.db');
    const first = new MeetingsDb(file);
    const folder = first.createFolder('Design');
    first.setFolderContext(folder.id, 'weekly design syncs');
    first.close();

    const second = new MeetingsDb(file);
    expect(second.listFolders()[0].context).toBe('weekly design syncs');
    second.close();
    const third = new MeetingsDb(file);
    expect(third.listFolders()[0].context).toBe('weekly design syncs');
    third.close();
  });

  it('recovers a half-migrated database whose context column exists but user_version is still 8', () => {
    const file = path.join(tmpDir(), 'half.db');
    const first = new MeetingsDb(file);
    const folder = first.createFolder('Ops');
    first.setFolderContext(folder.id, 'incident reviews');
    first.db.exec('PRAGMA user_version = 8');
    first.close();

    const db = new MeetingsDb(file);
    expect(db.db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 9 });
    expect(db.listFolders()[0].context).toBe('incident reviews');
    db.close();
  });

  it('rejects context for a missing folder with not-found and does not create a row', () => {
    const db = new MeetingsDb(path.join(tmpDir(), 'missing.db'));
    expect(() => db.setFolderContext('f-nope', 'x')).toThrow(FolderError);
    expect(db.listFolders()).toEqual([]);
    db.close();
  });

  it('stores context exactly as given by the db layer (trimming is the route\'s job)', () => {
    const db = new MeetingsDb(path.join(tmpDir(), 'raw.db'));
    const folder = db.createFolder('Raw');
    expect(db.setFolderContext(folder.id, '  padded  ').context).toBe('  padded  ');
    db.close();
  });
});
