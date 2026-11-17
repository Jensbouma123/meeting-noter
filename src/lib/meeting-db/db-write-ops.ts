import type { DatabaseSync } from 'node:sqlite';
import { deleteAllMeetingRows, deleteMeetingRows } from './meeting-delete';
import { upsertMeetingRows } from './meeting-upsert';
import { scrubDeletedText } from './scrub';
import { runInTransaction } from './transaction';
import type { DeleteAllResult, MeetingDeleteResult, StoredMeeting, UpsertOptions, UpsertResult } from './types';

export function writeUpsertMeeting(db: DatabaseSync, meeting: StoredMeeting, opts: UpsertOptions): UpsertResult {
  const { result, shrunk } = runInTransaction(db, () => upsertMeetingRows(db, meeting, opts));
  if (result === 'written' && shrunk) scrubDeletedText(db, false);
  return result;
}

export function writeDeleteMeeting(db: DatabaseSync, id: string, now: number): MeetingDeleteResult {
  const result = runInTransaction(db, () => deleteMeetingRows(db, id, now));
  scrubDeletedText(db, result.deleted);
  return result;
}

export function writeDeleteAllMeetings(db: DatabaseSync, now: number): DeleteAllResult {
  const out = runInTransaction(db, () => deleteAllMeetingRows(db, now));
  scrubDeletedText(db, true);
  return out;
}
