import type { DatabaseSync } from 'node:sqlite';
import { ftsQuery } from './fts-query';
import { SUMMARY_COLUMNS, str, toSummaryRow } from './row-mapping';
import type { ListOptions, MeetingSearchHit, MeetingSummaryRow, SearchOptions } from './types';

export function listMeetingRows(db: DatabaseSync, opts: ListOptions): MeetingSummaryRow[] {
  const limit = Math.max(1, Math.min(opts.limit ?? 1000, 1000));
  const where = opts.includeDrafts === false ? 'WHERE m.is_draft = 0' : '';
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS} FROM meetings m ${where}
       ORDER BY COALESCE(m.started_at, m.created_at) DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, Math.max(0, opts.offset ?? 0))
    .map(toSummaryRow);
}

export function searchMeetingRows(db: DatabaseSync, text: string, opts: SearchOptions): MeetingSearchHit[] {
  const query = ftsQuery(text);
  if (!query) return [];
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS}, snippet(meetings_fts, -1, '[', ']', '…', 16) AS snippet
       FROM meetings_fts JOIN meetings m ON m.rowid = meetings_fts.rowid
       WHERE meetings_fts MATCH ?
       ORDER BY bm25(meetings_fts, 10.0, 4.0, 1.0) LIMIT ?`,
    )
    .all(query, limit)
    .map((row) => ({ ...toSummaryRow(row), snippet: str(row.snippet) }));
}
