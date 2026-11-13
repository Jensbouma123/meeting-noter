import type { DatabaseSync } from 'node:sqlite';
import { FolderError } from './folder-error';
import { num, str } from './row-mapping';
import type { FolderRow } from './types';

export function folderExists(db: DatabaseSync, id: string): boolean {
  return !!db.prepare('SELECT 1 FROM folders WHERE id = ?').get(id);
}

export function folderSubtreeIds(db: DatabaseSync, id: string): string[] {
  return db
    .prepare(
      `WITH RECURSIVE sub(id) AS (
         SELECT id FROM folders WHERE id = ?
         UNION SELECT f.id FROM folders f JOIN sub ON f.parent_id = sub.id
       ) SELECT id FROM sub`,
    )
    .all(id)
    .map((r) => String(r.id));
}

export function nextSiblingSort(db: DatabaseSync, parentId: string | null): number {
  const row = db.prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM folders WHERE parent_id IS ?').get(parentId);
  return num(row?.next ?? 0);
}

export function readFolder(db: DatabaseSync, id: string): FolderRow {
  const r = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  if (!r) throw new FolderError('not-found');
  return {
    id: str(r.id),
    parentId: r.parent_id === null ? null : str(r.parent_id),
    name: str(r.name),
    sort: num(r.sort),
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  };
}

export function readAllFolders(db: DatabaseSync): FolderRow[] {
  return db
    .prepare('SELECT id FROM folders ORDER BY sort, name COLLATE NOCASE, id')
    .all()
    .map((r) => readFolder(db, String(r.id)));
}
