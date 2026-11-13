import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import type { CaptureMode, Source, Speaker } from '../meeting/types';
import type { ActionItem, Decision } from '../meeting/types/notes';
import { searchSummary, speakerNames, summaryText, transcriptText } from './markdown';
import { randomUUID } from 'node:crypto';
import type { FolderRow, MeetingSearchHit, MeetingSummaryRow, StoredMeeting, StoredSegment } from './types';

/**
 * The meetings database: one SQLite file (`meetings.db`, see `paths.ts`) that
 * the Next.js API routes write and the MCP server reads. Tables:
 * - `meetings`: one row per meeting, with the notes and participants as JSON
 *   and the summary text rendered from them;
 * - `segments`: the final transcript lines, in order;
 * - `speakers`: each meeting's speaker labels;
 * - `folders`: the nested folder tree (`parent_id` null at the root); a meeting's
 *   `folder_id` null means unfiled;
 * - `meetings_fts`: FTS5 over title, summary and transcript, its rowid the
 *   meeting row's rowid.
 * Uses Node's built-in `node:sqlite` (Node >= 22.13; the installer ships 24),
 * so there is no native module to build per arch.
 */

const SCHEMA_VERSION = 5;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  duration_seconds INTEGER,
  segment_count INTEGER NOT NULL DEFAULT 0,
  capture_mode TEXT,
  is_draft INTEGER NOT NULL DEFAULT 0,
  speaker_names TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '{"actions":[],"decisions":[]}',
  markdown_file TEXT,
  participants TEXT,
  folder_id TEXT
);
CREATE TABLE IF NOT EXISTS segments (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  segment_id TEXT NOT NULL,
  source TEXT NOT NULL,
  speaker_id TEXT NOT NULL,
  start_s REAL NOT NULL,
  end_s REAL NOT NULL,
  text TEXT NOT NULL,
  overlap TEXT,
  low_conf_spans TEXT,
  PRIMARY KEY (meeting_id, seq)
);
CREATE TABLE IF NOT EXISTS speakers (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  speaker_id TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  color_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (meeting_id, speaker_id)
);
CREATE VIRTUAL TABLE IF NOT EXISTS meetings_fts USING fts5(
  title, summary, transcript,
  tokenize = 'unicode61 remove_diacritics 2'
);
-- v2: deleted meetings stay deleted, so a browser holding an old copy cannot bring one back.
CREATE TABLE IF NOT EXISTS deleted_meetings (
  id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
-- v4: nested folders; a meeting's folder_id null means unfiled.
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES folders(id),
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- v2: facts about this DB, such as when the browser meetings were first moved in.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export type FolderErrorCode = 'not-found' | 'bad-name' | 'bad-parent' | 'cycle';

/** A folder operation the tree cannot take; `code` says why. */
export class FolderError extends Error {
  constructor(readonly code: FolderErrorCode) {
    super(code);
  }
}

export const MAX_FOLDER_NAME = 200;

/** A folder name trimmed and checked; throws `bad-name` when empty or too long. */
function cleanFolderName(name: unknown): string {
  const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (!clean || clean.length > MAX_FOLDER_NAME) throw new FolderError('bad-name');
  return clean;
}

export type FolderDeleteMode = 'move-up' | 'delete-contents';

/** `'deleted'`: the meeting was deleted from this DB and is not stored again. */
export type UpsertResult = 'written' | 'stale' | 'deleted';

type Row = Record<string, SQLOutputValue>;

const num = (v: SQLOutputValue): number => Number(v);
const numOrNull = (v: SQLOutputValue): number | null => (v === null ? null : Number(v));
const str = (v: SQLOutputValue): string => (v === null ? '' : String(v));

function parseJson<T>(raw: SQLOutputValue, fallback: T): T {
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function summaryRow(row: Row): MeetingSummaryRow {
  return {
    id: str(row.id),
    title: str(row.title),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    startedAt: numOrNull(row.started_at),
    durationSeconds: numOrNull(row.duration_seconds),
    segmentCount: num(row.segment_count),
    captureMode: (row.capture_mode as CaptureMode | null) ?? null,
    isDraft: num(row.is_draft) === 1,
    speakers: parseJson<string[]>(row.speaker_names, []),
    folderId: row.folder_id === null ? null : str(row.folder_id),
  };
}

const SUMMARY_COLUMNS =
  'm.id, m.title, m.created_at, m.updated_at, m.started_at, m.duration_seconds, m.segment_count, m.capture_mode, m.is_draft, m.speaker_names, m.folder_id';

/**
 * FTS5 query from free text: every word becomes a quoted prefix term, all
 * required. Quoting keeps FTS operators (`AND`, `-`, `:` …) in user text from
 * being parsed. Null when the text has no words.
 */
export function ftsQuery(text: string): string | null {
  const words = text.match(/[\p{L}\p{N}_]+/gu);
  if (!words || words.length === 0) return null;
  return words.map((w) => `"${w}"*`).join(' ');
}

export class MeetingsDb {
  readonly db: DatabaseSync;

  constructor(file: string, opts: { readOnly?: boolean } = {}) {
    this.db = new DatabaseSync(file, { readOnly: opts.readOnly ?? false, timeout: 5000 });
    if (opts.readOnly) return;
    // secure_delete zeroes freed pages, and FTS5's own `secure-delete` does the same for the
    // index, so deleted text does not linger in free pages (see `scrub`).
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
    const version = num(this.db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
    if (version < SCHEMA_VERSION) {
      this.db.exec(SCHEMA);
      // v3: participants. `CREATE TABLE IF NOT EXISTS` leaves an older table without the column.
      const columns = this.db.prepare('PRAGMA table_info(meetings)').all().map((c) => String(c.name));
      if (!columns.includes('participants')) this.db.exec('ALTER TABLE meetings ADD COLUMN participants TEXT');
      // v4: folder_id.
      if (!columns.includes('folder_id')) this.db.exec('ALTER TABLE meetings ADD COLUMN folder_id TEXT');
      // v5: segments.low_conf_spans (JSON); old rows stay NULL, which reads as no spans.
      const segmentColumns = this.db.prepare('PRAGMA table_info(segments)').all().map((c) => String(c.name));
      if (!segmentColumns.includes('low_conf_spans')) this.db.exec('ALTER TABLE segments ADD COLUMN low_conf_spans TEXT');
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
    this.db.exec("INSERT INTO meetings_fts (meetings_fts, rank) VALUES ('secure-delete', 1)");
  }

  /**
   * Make removed text unrecoverable from the files: rewrite the DB without free
   * pages (VACUUM) and empty the WAL, which holds copies of every page written.
   * Best-effort when a reader (the MCP server) keeps the WAL busy; the zeroed
   * pages from secure_delete are already in place by then.
   */
  private scrub(vacuum: boolean): void {
    try {
      if (vacuum) this.db.exec('VACUUM');
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch {
      // A busy WAL is retried on the next delete.
    }
  }

  close(): void {
    this.db.close();
  }

  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Store a meeting, replacing its transcript and speakers. A meeting already
   * stored with a newer `updatedAt` is kept (`'stale'`); with `onlyIfNewer`,
   * so is one with the same `updatedAt`, which makes re-imports no-ops.
   */
  upsert(meeting: StoredMeeting, opts: { onlyIfNewer?: boolean; markdownFile?: string | null } = {}): UpsertResult {
    let shrunk = false;
    const result = this.transaction(() => {
      if (this.db.prepare('SELECT 1 FROM deleted_meetings WHERE id = ?').get(meeting.id)) return 'deleted';
      const existing = this.db.prepare('SELECT updated_at, segment_count, folder_id, title, notes, participants FROM meetings WHERE id = ?').get(meeting.id);
      if (existing) {
        const stored = num(existing.updated_at);
        if (stored > meeting.updatedAt || (opts.onlyIfNewer && stored === meeting.updatedAt)) return 'stale';
      }
      const segments = meeting.segments.slice().sort((a, b) => a.start - b.start);
      shrunk = !!existing && num(existing.segment_count) > segments.length;
      // Renamed, re-noted or participants edited: the old text sits in the WAL too.
      if (existing && !shrunk) {
        const newParticipants = meeting.participants === null ? null : JSON.stringify(meeting.participants);
        shrunk =
          str(existing.title) !== meeting.title ||
          str(existing.notes) !== JSON.stringify(meeting.notes) ||
          (existing.participants === null ? null : str(existing.participants)) !== newParticipants;
      }
      // Absent `folderId` (a browser that knows no folders) keeps the filing; an unknown folder unfiles.
      let folderId: string | null = null;
      if (meeting.folderId === undefined) folderId = existing && existing.folder_id !== null ? str(existing.folder_id) : null;
      else if (meeting.folderId !== null && this.folderExists(meeting.folderId)) folderId = meeting.folderId;
      const params = {
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.createdAt,
        updated_at: meeting.updatedAt,
        started_at: meeting.startedAt,
        duration_seconds: meeting.durationSeconds,
        segment_count: segments.length,
        capture_mode: meeting.captureMode,
        is_draft: meeting.isDraft ? 1 : 0,
        speaker_names: JSON.stringify(speakerNames(meeting)),
        summary: summaryText(meeting),
        notes: JSON.stringify(meeting.notes),
        markdown_file: opts.markdownFile ?? null,
        participants: meeting.participants === null ? null : JSON.stringify(meeting.participants),
        folder_id: folderId,
      };
      this.db
        .prepare(
          `INSERT INTO meetings (id, title, created_at, updated_at, started_at, duration_seconds, segment_count,
             capture_mode, is_draft, speaker_names, summary, notes, markdown_file, participants, folder_id)
           VALUES (:id, :title, :created_at, :updated_at, :started_at, :duration_seconds, :segment_count,
             :capture_mode, :is_draft, :speaker_names, :summary, :notes, :markdown_file, :participants, :folder_id)
           ON CONFLICT(id) DO UPDATE SET title = excluded.title, created_at = excluded.created_at,
             updated_at = excluded.updated_at, started_at = excluded.started_at,
             duration_seconds = excluded.duration_seconds, segment_count = excluded.segment_count,
             capture_mode = excluded.capture_mode, is_draft = excluded.is_draft,
             speaker_names = excluded.speaker_names, summary = excluded.summary, notes = excluded.notes,
             markdown_file = excluded.markdown_file, participants = excluded.participants, folder_id = excluded.folder_id`,
        )
        .run(params);
      const rowid = num(this.db.prepare('SELECT rowid FROM meetings WHERE id = ?').get(meeting.id)!.rowid);

      this.db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(meeting.id);
      const insertSegment = this.db.prepare(
        `INSERT INTO segments (meeting_id, seq, segment_id, source, speaker_id, start_s, end_s, text, overlap, low_conf_spans)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      segments.forEach((s, seq) => {
        insertSegment.run(meeting.id, seq, s.id, s.source, s.speaker, s.start, s.end, s.text,
          s.overlap ? JSON.stringify(s.overlap) : null,
          s.lowConfSpans?.length ? JSON.stringify(s.lowConfSpans) : null);
      });

      this.db.prepare('DELETE FROM speakers WHERE meeting_id = ?').run(meeting.id);
      const insertSpeaker = this.db.prepare(
        'INSERT INTO speakers (meeting_id, speaker_id, source, label, color_index) VALUES (?, ?, ?, ?, ?)',
      );
      for (const [key, sp] of Object.entries(meeting.speakers)) {
        insertSpeaker.run(meeting.id, key, sp.source, sp.label, sp.colorIndex);
      }

      this.db.prepare('DELETE FROM meetings_fts WHERE rowid = ?').run(rowid);
      this.db
        .prepare('INSERT INTO meetings_fts (rowid, title, summary, transcript) VALUES (?, ?, ?, ?)')
        .run(rowid, meeting.title, searchSummary(meeting), transcriptText(meeting));
      return 'written';
    });
    // Cleared transcript, rename, or notes/participant edit: old text sits in the WAL until it is emptied.
    if (result === 'written' && shrunk) this.scrub(false);
    return result;
  }

  /**
   * Remove a meeting and everything it owns, and remember the id so it is
   * never stored again. Returns its Markdown file name, if it had one.
   */
  delete(id: string, now = Date.now()): { deleted: boolean; markdownFile: string | null } {
    const result = this.transaction(() => this.deleteMeetingRows(id, now));
    this.scrub(result.deleted);
    return result;
  }

  /** The rows of one meeting delete; the single path `delete` and `deleteFolder` share. */
  private deleteMeetingRows(id: string, now: number): { deleted: boolean; markdownFile: string | null } {
    this.db.prepare('INSERT OR IGNORE INTO deleted_meetings (id, deleted_at) VALUES (?, ?)').run(id, now);
    const row = this.db.prepare('SELECT rowid, markdown_file FROM meetings WHERE id = ?').get(id);
    if (!row) return { deleted: false, markdownFile: null };
    this.db.prepare('DELETE FROM meetings_fts WHERE rowid = ?').run(row.rowid);
    this.db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(id);
    this.db.prepare('DELETE FROM speakers WHERE meeting_id = ?').run(id);
    this.db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
    return { deleted: true, markdownFile: row.markdown_file === null ? null : String(row.markdown_file) };
  }

  private folderExists(id: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM folders WHERE id = ?').get(id);
  }

  /** `id` and every folder below it. */
  private folderSubtree(id: string): string[] {
    return this.db
      .prepare(
        `WITH RECURSIVE sub(id) AS (
           SELECT id FROM folders WHERE id = ?
           UNION SELECT f.id FROM folders f JOIN sub ON f.parent_id = sub.id
         ) SELECT id FROM sub`,
      )
      .all(id)
      .map((r) => String(r.id));
  }

  private nextSort(parentId: string | null): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM folders WHERE parent_id IS ?')
      .get(parentId);
    return num(row?.next ?? 0);
  }

  private folderRow(id: string): FolderRow {
    const r = this.db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
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

  /** Every folder, siblings in `sort` order (then name); build the tree from `parentId`. */
  listFolders(): FolderRow[] {
    return this.db
      .prepare('SELECT id FROM folders ORDER BY sort, name COLLATE NOCASE, id')
      .all()
      .map((r) => this.folderRow(String(r.id)));
  }

  /** New folder under `parentId` (null: the root), last among its siblings. Throws `bad-name` / `bad-parent`. */
  createFolder(name: string, parentId: string | null = null, now = Date.now(), id = randomUUID()): FolderRow {
    const clean = cleanFolderName(name);
    return this.transaction(() => {
      if (parentId !== null && !this.folderExists(parentId)) throw new FolderError('bad-parent');
      this.db
        .prepare('INSERT INTO folders (id, parent_id, name, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, parentId, clean, this.nextSort(parentId), now, now);
      return this.folderRow(id);
    });
  }

  renameFolder(id: string, name: string, now = Date.now()): FolderRow {
    const clean = cleanFolderName(name);
    return this.transaction(() => {
      this.folderRow(id);
      this.db.prepare('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?').run(clean, now, id);
      return this.folderRow(id);
    });
  }

  /**
   * Re-parent a folder (null: the root), last among its new siblings. Throws
   * `not-found`, `bad-parent` (no such parent) or `cycle` (the folder itself or
   * one of its descendants).
   */
  moveFolder(id: string, parentId: string | null, now = Date.now()): FolderRow {
    return this.transaction(() => {
      this.folderRow(id);
      if (parentId !== null) {
        if (!this.folderExists(parentId)) throw new FolderError('bad-parent');
        if (this.folderSubtree(id).includes(parentId)) throw new FolderError('cycle');
      }
      this.db
        .prepare('UPDATE folders SET parent_id = ?, sort = ?, updated_at = ? WHERE id = ?')
        .run(parentId, this.nextSort(parentId), now, id);
      return this.folderRow(id);
    });
  }

  /** Put a folder at `index` among its siblings and renumber them. Throws `not-found`. */
  reorderFolder(id: string, index: number, now = Date.now()): FolderRow {
    return this.transaction(() => {
      const folder = this.folderRow(id);
      const siblings = this.listFolders().filter((f) => f.parentId === folder.parentId && f.id !== id);
      siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, folder);
      const update = this.db.prepare('UPDATE folders SET sort = ?, updated_at = ? WHERE id = ?');
      siblings.forEach((f, i) => update.run(i, f.id === id ? now : f.updatedAt, f.id));
      return this.folderRow(id);
    });
  }

  /**
   * File a meeting in a folder (null: unfile). Bumps `updated_at` so browsers
   * pull the change. Throws `not-found` for a missing meeting, `bad-parent` for a missing folder.
   */
  moveMeeting(meetingId: string, folderId: string | null, now = Date.now()): void {
    this.transaction(() => {
      if (!this.db.prepare('SELECT 1 FROM meetings WHERE id = ?').get(meetingId)) throw new FolderError('not-found');
      if (folderId !== null && !this.folderExists(folderId)) throw new FolderError('bad-parent');
      this.db
        .prepare('UPDATE meetings SET folder_id = ?, updated_at = MAX(updated_at + 1, ?) WHERE id = ?')
        .run(folderId, now, meetingId);
    });
  }

  /**
   * Delete a folder. `move-up`: its subfolders and meetings go to its parent.
   * `delete-contents`: every folder below it and every meeting in them are
   * deleted, each meeting through the same path as `delete` (remembered, scrubbed).
   * Returns the Markdown files of the deleted meetings.
   */
  deleteFolder(
    id: string,
    mode: FolderDeleteMode,
    now = Date.now(),
  ): { folders: number; meetings: number; markdownFiles: string[] } {
    const out = this.transaction(() => {
      const folder = this.folderRow(id);
      if (mode === 'move-up') {
        this.db.prepare('UPDATE folders SET parent_id = ?, updated_at = ? WHERE parent_id = ?').run(folder.parentId, now, id);
        this.db
          .prepare('UPDATE meetings SET folder_id = ?, updated_at = MAX(updated_at + 1, ?) WHERE folder_id = ?')
          .run(folder.parentId, now, id);
        this.db.prepare('DELETE FROM folders WHERE id = ?').run(id);
        return { folders: 1, meetings: 0, markdownFiles: [] as string[] };
      }
      const ids = this.folderSubtree(id);
      const marks = ids.map(() => '?').join(',');
      const meetingIds = this.db
        .prepare(`SELECT id FROM meetings WHERE folder_id IN (${marks})`)
        .all(...ids)
        .map((r) => String(r.id));
      const markdownFiles: string[] = [];
      for (const mid of meetingIds) {
        const r = this.deleteMeetingRows(mid, now);
        if (r.markdownFile) markdownFiles.push(r.markdownFile);
      }
      this.db.prepare(`DELETE FROM folders WHERE id IN (${marks})`).run(...ids);
      return { folders: ids.length, meetings: meetingIds.length, markdownFiles };
    });
    this.scrub(out.meetings > 0);
    return out;
  }

  /**
   * Delete every meeting; every id is remembered (id and time only) like a
   * single delete. Returns how many were removed and their Markdown file names.
   */
  deleteAll(now = Date.now()): { count: number; markdownFiles: string[] } {
    const out = this.transaction(() => {
      const rows = this.db.prepare('SELECT id, markdown_file FROM meetings').all();
      this.db.prepare('INSERT OR IGNORE INTO deleted_meetings (id, deleted_at) SELECT id, ? FROM meetings').run(now);
      this.db.exec('DELETE FROM meetings_fts; DELETE FROM segments; DELETE FROM speakers; DELETE FROM meetings');
      return {
        count: rows.length,
        markdownFiles: rows.flatMap((r) => (r.markdown_file === null ? [] : [String(r.markdown_file)])),
      };
    });
    this.scrub(true);
    return out;
  }

  /** Ids of every meeting deleted from this DB. */
  deletedIds(): string[] {
    return this.db.prepare('SELECT id FROM deleted_meetings').all().map((row) => String(row.id));
  }

  /** Sets `key` unless it is set already; true when this call set it. */
  setMetaOnce(key: string, value: string): boolean {
    return Number(this.db.prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)').run(key, value).changes) > 0;
  }

  markdownFile(id: string): string | null {
    const row = this.db.prepare('SELECT markdown_file FROM meetings WHERE id = ?').get(id);
    return row && row.markdown_file !== null ? String(row.markdown_file) : null;
  }

  /** Meetings, newest first (by start, else creation). */
  list(opts: { limit?: number; offset?: number; includeDrafts?: boolean } = {}): MeetingSummaryRow[] {
    const limit = Math.max(1, Math.min(opts.limit ?? 1000, 1000));
    const where = opts.includeDrafts === false ? 'WHERE m.is_draft = 0' : '';
    return this.db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS} FROM meetings m ${where}
         ORDER BY COALESCE(m.started_at, m.created_at) DESC LIMIT ? OFFSET ?`,
      )
      .all(limit, Math.max(0, opts.offset ?? 0))
      .map(summaryRow);
  }

  /** Full-text search over title, summary and transcript, best match first. */
  search(text: string, opts: { limit?: number } = {}): MeetingSearchHit[] {
    const query = ftsQuery(text);
    if (!query) return [];
    const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
    return this.db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS}, snippet(meetings_fts, -1, '[', ']', '…', 16) AS snippet
         FROM meetings_fts JOIN meetings m ON m.rowid = meetings_fts.rowid
         WHERE meetings_fts MATCH ?
         ORDER BY bm25(meetings_fts, 10.0, 4.0, 1.0) LIMIT ?`,
      )
      .all(query, limit)
      .map((row) => ({ ...summaryRow(row), snippet: str(row.snippet) }));
  }

  get(id: string): StoredMeeting | null {
    const row = this.db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
    if (!row) return null;
    const segments: StoredSegment[] = this.db
      .prepare('SELECT * FROM segments WHERE meeting_id = ? ORDER BY seq')
      .all(id)
      .map((s) => {
        const seg: StoredSegment = {
          id: str(s.segment_id),
          source: str(s.source) as Source,
          speaker: str(s.speaker_id),
          text: str(s.text),
          start: num(s.start_s),
          end: num(s.end_s),
        };
        const overlap = parseJson<StoredSegment['overlap'] | null>(s.overlap, null);
        if (overlap) seg.overlap = overlap;
        const spans = parseJson<StoredSegment['lowConfSpans'] | null>(s.low_conf_spans, null);
        if (spans?.length) seg.lowConfSpans = spans;
        return seg;
      });
    const speakers: Record<string, Speaker> = {};
    for (const s of this.db.prepare('SELECT * FROM speakers WHERE meeting_id = ?').all(id)) {
      speakers[str(s.speaker_id)] = {
        id: str(s.speaker_id),
        source: str(s.source) as Source,
        label: str(s.label),
        colorIndex: num(s.color_index),
      };
    }
    const notes = parseJson<{ actions: ActionItem[]; decisions: Decision[] }>(row.notes, {
      actions: [],
      decisions: [],
    });
    return {
      id: str(row.id),
      title: str(row.title),
      createdAt: num(row.created_at),
      updatedAt: num(row.updated_at),
      startedAt: numOrNull(row.started_at),
      durationSeconds: numOrNull(row.duration_seconds),
      captureMode: (row.capture_mode as CaptureMode | null) ?? null,
      isDraft: num(row.is_draft) === 1,
      segments,
      speakers,
      notes,
      participants: parseJson<string[] | null>(row.participants, null),
      folderId: row.folder_id === null ? null : str(row.folder_id),
    };
  }
}
