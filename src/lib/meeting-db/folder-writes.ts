import type { DatabaseSync } from 'node:sqlite';
import { FolderError } from './folder-error';
import { folderExists, folderSubtreeIds, nextSiblingSort, readAllFolders, readFolder } from './folder-queries';
import type { FolderRow } from './types';

export function insertFolder(db: DatabaseSync, id: string, name: string, parentId: string | null, now: number): FolderRow {
  if (parentId !== null && !folderExists(db, parentId)) throw new FolderError('bad-parent');
  db.prepare('INSERT INTO folders (id, parent_id, name, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    parentId,
    name,
    nextSiblingSort(db, parentId),
    now,
    now,
  );
  return readFolder(db, id);
}

export function updateFolderName(db: DatabaseSync, id: string, name: string, now: number): FolderRow {
  readFolder(db, id);
  db.prepare('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?').run(name, now, id);
  return readFolder(db, id);
}

export function reparentFolder(db: DatabaseSync, id: string, parentId: string | null, now: number): FolderRow {
  readFolder(db, id);
  if (parentId !== null) {
    if (!folderExists(db, parentId)) throw new FolderError('bad-parent');
    if (folderSubtreeIds(db, id).includes(parentId)) throw new FolderError('cycle');
  }
  db.prepare('UPDATE folders SET parent_id = ?, sort = ?, updated_at = ? WHERE id = ?').run(
    parentId,
    nextSiblingSort(db, parentId),
    now,
    id,
  );
  return readFolder(db, id);
}

export function renumberSiblings(db: DatabaseSync, id: string, index: number, now: number): FolderRow {
  const folder = readFolder(db, id);
  const siblings = readAllFolders(db).filter((f) => f.parentId === folder.parentId && f.id !== id);
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, folder);
  const update = db.prepare('UPDATE folders SET sort = ?, updated_at = ? WHERE id = ?');
  siblings.forEach((f, i) => update.run(i, f.id === id ? now : f.updatedAt, f.id));
  return readFolder(db, id);
}

export function fileMeetingInFolder(db: DatabaseSync, meetingId: string, folderId: string | null, now: number): void {
  if (!db.prepare('SELECT 1 FROM meetings WHERE id = ?').get(meetingId)) throw new FolderError('not-found');
  if (folderId !== null && !folderExists(db, folderId)) throw new FolderError('bad-parent');
  db.prepare('UPDATE meetings SET folder_id = ?, updated_at = MAX(updated_at + 1, ?) WHERE id = ?').run(folderId, now, meetingId);
}
