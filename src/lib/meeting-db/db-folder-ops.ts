import type { DatabaseSync } from 'node:sqlite';
import { cleanFolderName } from './folder-name';
import {
  fileMeetingInFolder,
  insertFolder,
  renumberSiblings,
  reparentFolder,
  updateFolderContext,
  updateFolderName,
  updateFolderRoster,
} from './folder-writes';
import { deleteFolderRows } from './meeting-delete';
import { scrubDeletedText } from './scrub';
import { runInTransaction } from './transaction';
import type { FolderDeleteMode, FolderDeleteResult, FolderRow } from './types';

export function writeCreateFolder(
  db: DatabaseSync,
  id: string,
  name: string,
  parentId: string | null,
  now: number,
): FolderRow {
  return runInTransaction(db, () => insertFolder(db, id, cleanFolderName(name), parentId, now));
}

export function writeRenameFolder(db: DatabaseSync, id: string, name: string, now: number): FolderRow {
  return runInTransaction(db, () => updateFolderName(db, id, cleanFolderName(name), now));
}

export function writeMoveFolder(db: DatabaseSync, id: string, parentId: string | null, now: number): FolderRow {
  return runInTransaction(db, () => reparentFolder(db, id, parentId, now));
}

export function writeReorderFolder(db: DatabaseSync, id: string, index: number, now: number): FolderRow {
  return runInTransaction(db, () => renumberSiblings(db, id, index, now));
}

export function writeMoveMeeting(db: DatabaseSync, meetingId: string, folderId: string | null, now: number): void {
  runInTransaction(db, () => fileMeetingInFolder(db, meetingId, folderId, now));
}

export function writeFolderRoster(
  db: DatabaseSync,
  id: string,
  roster: readonly string[],
  inheritRoster: boolean,
  now: number,
): FolderRow {
  return runInTransaction(db, () => updateFolderRoster(db, id, roster, inheritRoster, now));
}

export function writeFolderContext(db: DatabaseSync, id: string, context: string, now: number): FolderRow {
  return runInTransaction(db, () => updateFolderContext(db, id, context, now));
}

export function writeDeleteFolder(
  db: DatabaseSync,
  id: string,
  mode: FolderDeleteMode,
  now: number,
): FolderDeleteResult {
  const out = runInTransaction(db, () => deleteFolderRows(db, id, mode, now));
  scrubDeletedText(db, out.meetings > 0);
  return out;
}
