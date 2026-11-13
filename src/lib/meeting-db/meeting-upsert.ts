import type { DatabaseSync } from 'node:sqlite';
import {
  replaceSearchIndex,
  replaceSegments,
  replaceSpeakers,
  resolveFolderId,
  sortedByStart,
  textWasRewritten,
  writeMeetingRow,
} from './meeting-write-parts';
import { num } from './row-mapping';
import type { StoredMeeting, UpsertOptions, UpsertOutcome } from './types';

export function upsertMeetingRows(db: DatabaseSync, meeting: StoredMeeting, opts: UpsertOptions): UpsertOutcome {
  if (db.prepare('SELECT 1 FROM deleted_meetings WHERE id = ?').get(meeting.id)) return { result: 'deleted', shrunk: false };
  const existing = db
    .prepare('SELECT updated_at, segment_count, folder_id, title, notes, participants FROM meetings WHERE id = ?')
    .get(meeting.id);
  if (existing) {
    const stored = num(existing.updated_at);
    if (stored > meeting.updatedAt || (opts.onlyIfNewer && stored === meeting.updatedAt)) return { result: 'stale', shrunk: false };
  }
  const segments = sortedByStart(meeting);
  let shrunk = !!existing && num(existing.segment_count) > segments.length;
  if (existing && !shrunk) shrunk = textWasRewritten(existing, meeting);
  const folderId = resolveFolderId(db, meeting, existing);
  writeMeetingRow(db, meeting, segments.length, folderId, opts.markdownFile ?? null);
  const rowid = num(db.prepare('SELECT rowid FROM meetings WHERE id = ?').get(meeting.id)!.rowid);
  replaceSegments(db, meeting.id, segments);
  replaceSpeakers(db, meeting);
  replaceSearchIndex(db, rowid, meeting);
  return { result: 'written', shrunk };
}
