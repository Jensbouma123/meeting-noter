import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import type { CaptureMode, Source, Speaker } from '../meeting/types';
import type { ActionItem, Decision } from '../meeting/notes';
import { speakerNames, summaryText, transcriptText } from './markdown';
import type { MeetingSearchHit, MeetingSummaryRow, StoredMeeting, StoredSegment } from './types';

/**
 * The meetings database: one SQLite file (`meetings.db`, see `paths.ts`) that
 * the Next.js API routes write and the MCP server reads. Tables:
 * - `meetings`: one row per meeting, with the notes as JSON and the summary
 *   text rendered from them;
 * - `segments`: the final transcript lines, in order;
 * - `speakers`: each meeting's speaker labels;
 * - `meetings_fts`: FTS5 over title, summary and transcript, its rowid the
 *   meeting row's rowid.
 * Uses Node's built-in `node:sqlite` (Node >= 22.13; the installer ships 24),
 * so there is no native module to build per arch.
 */

const SCHEMA_VERSION = 2;

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
  markdown_file TEXT
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
-- v2: facts about this DB, such as when the browser meetings were first moved in.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

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
  };
}

const SUMMARY_COLUMNS =
  'm.id, m.title, m.created_at, m.updated_at, m.started_at, m.duration_seconds, m.segment_count, m.capture_mode, m.is_draft, m.speaker_names';

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
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const version = num(this.db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
    if (version < SCHEMA_VERSION) {
      this.db.exec(SCHEMA);
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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
    return this.transaction(() => {
      if (this.db.prepare('SELECT 1 FROM deleted_meetings WHERE id = ?').get(meeting.id)) return 'deleted';
      const existing = this.db.prepare('SELECT updated_at FROM meetings WHERE id = ?').get(meeting.id);
      if (existing) {
        const stored = num(existing.updated_at);
        if (stored > meeting.updatedAt || (opts.onlyIfNewer && stored === meeting.updatedAt)) return 'stale';
      }
      const segments = meeting.segments.slice().sort((a, b) => a.start - b.start);
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
      };
      this.db
        .prepare(
          `INSERT INTO meetings (id, title, created_at, updated_at, started_at, duration_seconds, segment_count,
             capture_mode, is_draft, speaker_names, summary, notes, markdown_file)
           VALUES (:id, :title, :created_at, :updated_at, :started_at, :duration_seconds, :segment_count,
             :capture_mode, :is_draft, :speaker_names, :summary, :notes, :markdown_file)
           ON CONFLICT(id) DO UPDATE SET title = excluded.title, created_at = excluded.created_at,
             updated_at = excluded.updated_at, started_at = excluded.started_at,
             duration_seconds = excluded.duration_seconds, segment_count = excluded.segment_count,
             capture_mode = excluded.capture_mode, is_draft = excluded.is_draft,
             speaker_names = excluded.speaker_names, summary = excluded.summary, notes = excluded.notes,
             markdown_file = excluded.markdown_file`,
        )
        .run(params);
      const rowid = num(this.db.prepare('SELECT rowid FROM meetings WHERE id = ?').get(meeting.id)!.rowid);

      this.db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(meeting.id);
      const insertSegment = this.db.prepare(
        `INSERT INTO segments (meeting_id, seq, segment_id, source, speaker_id, start_s, end_s, text, overlap)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      segments.forEach((s, seq) => {
        insertSegment.run(meeting.id, seq, s.id, s.source, s.speaker, s.start, s.end, s.text,
          s.overlap ? JSON.stringify(s.overlap) : null);
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
        .run(rowid, meeting.title, params.summary, transcriptText(meeting));
      return 'written';
    });
  }

  /**
   * Remove a meeting and everything it owns, and remember the id so it is
   * never stored again. Returns its Markdown file name, if it had one.
   */
  delete(id: string, now = Date.now()): { deleted: boolean; markdownFile: string | null } {
    return this.transaction(() => {
      this.db.prepare('INSERT OR IGNORE INTO deleted_meetings (id, deleted_at) VALUES (?, ?)').run(id, now);
      const row = this.db.prepare('SELECT rowid, markdown_file FROM meetings WHERE id = ?').get(id);
      if (!row) return { deleted: false, markdownFile: null };
      this.db.prepare('DELETE FROM meetings_fts WHERE rowid = ?').run(row.rowid);
      this.db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(id);
      this.db.prepare('DELETE FROM speakers WHERE meeting_id = ?').run(id);
      this.db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
      return { deleted: true, markdownFile: row.markdown_file === null ? null : String(row.markdown_file) };
    });
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
    };
  }
}
