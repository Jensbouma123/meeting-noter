import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import {
  writeCreateFolder,
  writeDeleteFolder,
  writeFolderContext,
  writeFolderRoster,
  writeMoveFolder,
  writeMoveMeeting,
  writeRenameFolder,
  writeReorderFolder,
} from './db-folder-ops';
import { readDeletedIds, readMarkdownFile, readMeta, writeInsights, writeMeta, writeMetaOnce } from './db-meta-ops';
import { writeDeleteAllMeetings, writeDeleteMeeting, writeUpsertMeeting } from './db-write-ops';
import { readAllFolders } from './folder-queries';
import { declineFolderSuggestionRow } from './folder-suggestions';
import { listMeetingRows, searchMeetingRows } from './meeting-queries';
import { readMeeting } from './meeting-read';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';
import { prepareWritableDatabase } from './schema-migration';
import type {
  DeleteAllResult,
  FolderDeleteMode,
  FolderDeleteResult,
  FolderRow,
  ListOptions,
  MeetingDeleteResult,
  MeetingSearchHit,
  MeetingSummaryRow,
  SearchOptions,
  StoredMeeting,
  UpsertOptions,
  UpsertResult,
} from './types';

export class MeetingsDb {
  readonly db: DatabaseSync;

  constructor(file: string, opts: { readOnly?: boolean } = {}) {
    this.db = new DatabaseSync(file, { readOnly: opts.readOnly ?? false, timeout: 5000 });
    if (opts.readOnly) return;
    prepareWritableDatabase(this.db);
  }

  close(): void {
    this.db.close();
  }

  upsert(meeting: StoredMeeting, opts: UpsertOptions = {}): UpsertResult {
    return writeUpsertMeeting(this.db, meeting, opts);
  }

  delete(id: string, now = Date.now()): MeetingDeleteResult {
    return writeDeleteMeeting(this.db, id, now);
  }

  listFolders(): FolderRow[] {
    return readAllFolders(this.db);
  }

  createFolder(name: string, parentId: string | null = null, now = Date.now(), id = randomUUID()): FolderRow {
    return writeCreateFolder(this.db, id, name, parentId, now);
  }

  renameFolder(id: string, name: string, now = Date.now()): FolderRow {
    return writeRenameFolder(this.db, id, name, now);
  }

  moveFolder(id: string, parentId: string | null, now = Date.now()): FolderRow {
    return writeMoveFolder(this.db, id, parentId, now);
  }

  reorderFolder(id: string, index: number, now = Date.now()): FolderRow {
    return writeReorderFolder(this.db, id, index, now);
  }

  moveMeeting(meetingId: string, folderId: string | null, now = Date.now()): void {
    writeMoveMeeting(this.db, meetingId, folderId, now);
  }

  setFolderRoster(id: string, roster: readonly string[], inheritRoster: boolean, now = Date.now()): FolderRow {
    return writeFolderRoster(this.db, id, roster, inheritRoster, now);
  }

  setFolderContext(id: string, context: string, now = Date.now()): FolderRow {
    return writeFolderContext(this.db, id, context, now);
  }

  deleteFolder(id: string, mode: FolderDeleteMode, now = Date.now()): FolderDeleteResult {
    return writeDeleteFolder(this.db, id, mode, now);
  }

  deleteAll(now = Date.now()): DeleteAllResult {
    return writeDeleteAllMeetings(this.db, now);
  }

  deletedIds(): string[] {
    return readDeletedIds(this.db);
  }

  getMeta(key: string): string | null {
    return readMeta(this.db, key);
  }

  setMeta(key: string, value: string): void {
    writeMeta(this.db, key, value);
  }

  setMetaOnce(key: string, value: string): boolean {
    return writeMetaOnce(this.db, key, value);
  }

  setInsights(id: string, insights: InsightSet | null): boolean {
    return writeInsights(this.db, id, insights);
  }

  declineFolderSuggestion(meetingId: string, folderId: string): boolean {
    return declineFolderSuggestionRow(this.db, meetingId, folderId);
  }

  markdownFile(id: string): string | null {
    return readMarkdownFile(this.db, id);
  }

  list(opts: ListOptions = {}): MeetingSummaryRow[] {
    return listMeetingRows(this.db, opts);
  }

  search(text: string, opts: SearchOptions = {}): MeetingSearchHit[] {
    return searchMeetingRows(this.db, text, opts);
  }

  get(id: string): StoredMeeting | null {
    return readMeeting(this.db, id);
  }
}
