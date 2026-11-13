import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { cleanFolderName } from './folder-name';
import { readAllFolders } from './folder-queries';
import { fileMeetingInFolder, insertFolder, renumberSiblings, reparentFolder, updateFolderName } from './folder-writes';
import { deleteAllMeetingRows, deleteFolderRows, deleteMeetingRows } from './meeting-delete';
import { listMeetingRows, searchMeetingRows } from './meeting-queries';
import { readMeeting } from './meeting-read';
import { upsertMeetingRows } from './meeting-upsert';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';
import { scrubDeletedText } from './scrub';
import { prepareWritableDatabase } from './schema-migration';
import { runInTransaction } from './transaction';
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

  private transaction<T>(body: () => T): T {
    return runInTransaction(this.db, body);
  }

  private scrub(vacuum: boolean): void {
    scrubDeletedText(this.db, vacuum);
  }

  upsert(meeting: StoredMeeting, opts: UpsertOptions = {}): UpsertResult {
    const { result, shrunk } = this.transaction(() => upsertMeetingRows(this.db, meeting, opts));
    if (result === 'written' && shrunk) this.scrub(false);
    return result;
  }

  delete(id: string, now = Date.now()): MeetingDeleteResult {
    const result = this.transaction(() => deleteMeetingRows(this.db, id, now));
    this.scrub(result.deleted);
    return result;
  }

  listFolders(): FolderRow[] {
    return readAllFolders(this.db);
  }

  createFolder(name: string, parentId: string | null = null, now = Date.now(), id = randomUUID()): FolderRow {
    const clean = cleanFolderName(name);
    return this.transaction(() => insertFolder(this.db, id, clean, parentId, now));
  }

  renameFolder(id: string, name: string, now = Date.now()): FolderRow {
    const clean = cleanFolderName(name);
    return this.transaction(() => updateFolderName(this.db, id, clean, now));
  }

  moveFolder(id: string, parentId: string | null, now = Date.now()): FolderRow {
    return this.transaction(() => reparentFolder(this.db, id, parentId, now));
  }

  reorderFolder(id: string, index: number, now = Date.now()): FolderRow {
    return this.transaction(() => renumberSiblings(this.db, id, index, now));
  }

  moveMeeting(meetingId: string, folderId: string | null, now = Date.now()): void {
    this.transaction(() => fileMeetingInFolder(this.db, meetingId, folderId, now));
  }

  deleteFolder(id: string, mode: FolderDeleteMode, now = Date.now()): FolderDeleteResult {
    const out = this.transaction(() => deleteFolderRows(this.db, id, mode, now));
    this.scrub(out.meetings > 0);
    return out;
  }

  deleteAll(now = Date.now()): DeleteAllResult {
    const out = this.transaction(() => deleteAllMeetingRows(this.db, now));
    this.scrub(true);
    return out;
  }

  deletedIds(): string[] {
    return this.db.prepare('SELECT id FROM deleted_meetings').all().map((row) => String(row.id));
  }

  setMetaOnce(key: string, value: string): boolean {
    return Number(this.db.prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)').run(key, value).changes) > 0;
  }

  setInsights(id: string, insights: InsightSet | null): boolean {
    const json = insights === null ? null : JSON.stringify(insights);
    return Number(this.db.prepare('UPDATE meetings SET insights = ? WHERE id = ?').run(json, id).changes) > 0;
  }

  markdownFile(id: string): string | null {
    const row = this.db.prepare('SELECT markdown_file FROM meetings WHERE id = ?').get(id);
    return row && row.markdown_file !== null ? String(row.markdown_file) : null;
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
