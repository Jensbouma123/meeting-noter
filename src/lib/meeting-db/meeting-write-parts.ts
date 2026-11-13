import type { DatabaseSync } from 'node:sqlite';
import { folderExists } from './folder-queries';
import { searchSummary, speakerNames, summaryText, transcriptText } from './markdown';
import { str } from './row-mapping';
import type { SqlRow, StoredMeeting, StoredSegment } from './types';

export function sortedByStart(meeting: StoredMeeting): StoredSegment[] {
  return meeting.segments.slice().sort((a, b) => a.start - b.start);
}

export function textWasRewritten(existing: SqlRow, meeting: StoredMeeting): boolean {
  const newParticipants = meeting.participants === null ? null : JSON.stringify(meeting.participants);
  return (
    str(existing.title) !== meeting.title ||
    str(existing.notes) !== JSON.stringify(meeting.notes) ||
    (existing.participants === null ? null : str(existing.participants)) !== newParticipants
  );
}

export function resolveFolderId(db: DatabaseSync, meeting: StoredMeeting, existing: SqlRow | undefined): string | null {
  if (meeting.folderId === undefined) return existing && existing.folder_id !== null ? str(existing.folder_id) : null;
  if (meeting.folderId !== null && folderExists(db, meeting.folderId)) return meeting.folderId;
  return null;
}

export function writeMeetingRow(
  db: DatabaseSync,
  meeting: StoredMeeting,
  segmentCount: number,
  folderId: string | null,
  markdownFile: string | null,
): void {
  const params = {
    id: meeting.id,
    title: meeting.title,
    created_at: meeting.createdAt,
    updated_at: meeting.updatedAt,
    started_at: meeting.startedAt,
    duration_seconds: meeting.durationSeconds,
    segment_count: segmentCount,
    capture_mode: meeting.captureMode,
    is_draft: meeting.isDraft ? 1 : 0,
    speaker_names: JSON.stringify(speakerNames(meeting)),
    summary: summaryText(meeting),
    notes: JSON.stringify(meeting.notes),
    markdown_file: markdownFile,
    participants: meeting.participants === null ? null : JSON.stringify(meeting.participants),
    folder_id: folderId,
  };
  db.prepare(
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
  ).run(params);
}

export function replaceSegments(db: DatabaseSync, meetingId: string, segments: StoredSegment[]): void {
  db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(meetingId);
  const insertSegment = db.prepare(
    `INSERT INTO segments (meeting_id, seq, segment_id, source, speaker_id, start_s, end_s, text, overlap, low_conf_spans)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  segments.forEach((s, seq) => {
    insertSegment.run(
      meetingId,
      seq,
      s.id,
      s.source,
      s.speaker,
      s.start,
      s.end,
      s.text,
      s.overlap ? JSON.stringify(s.overlap) : null,
      s.lowConfSpans?.length ? JSON.stringify(s.lowConfSpans) : null,
    );
  });
}

export function replaceSpeakers(db: DatabaseSync, meeting: StoredMeeting): void {
  db.prepare('DELETE FROM speakers WHERE meeting_id = ?').run(meeting.id);
  const insertSpeaker = db.prepare(
    'INSERT INTO speakers (meeting_id, speaker_id, source, label, color_index) VALUES (?, ?, ?, ?, ?)',
  );
  for (const [key, sp] of Object.entries(meeting.speakers)) {
    insertSpeaker.run(meeting.id, key, sp.source, sp.label, sp.colorIndex);
  }
}

export function replaceSearchIndex(db: DatabaseSync, rowid: number, meeting: StoredMeeting): void {
  db.prepare('DELETE FROM meetings_fts WHERE rowid = ?').run(rowid);
  db.prepare('INSERT INTO meetings_fts (rowid, title, summary, transcript) VALUES (?, ?, ?, ?)').run(
    rowid,
    meeting.title,
    searchSummary(meeting),
    transcriptText(meeting),
  );
}
