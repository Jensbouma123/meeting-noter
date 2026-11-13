import type { DatabaseSync } from 'node:sqlite';
import type { CaptureMode, Source, Speaker } from '../meeting/types';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';
import { num, numOrNull, parseJson, str } from './row-mapping';
import type { SqlRow, StoredMeeting, StoredNotes, StoredSegment } from './types';

function toStoredSegment(s: SqlRow): StoredSegment {
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
}

function readSpeakers(db: DatabaseSync, meetingId: string): Record<string, Speaker> {
  const speakers: Record<string, Speaker> = {};
  for (const s of db.prepare('SELECT * FROM speakers WHERE meeting_id = ?').all(meetingId)) {
    speakers[str(s.speaker_id)] = {
      id: str(s.speaker_id),
      source: str(s.source) as Source,
      label: str(s.label),
      colorIndex: num(s.color_index),
    };
  }
  return speakers;
}

export function readMeeting(db: DatabaseSync, id: string): StoredMeeting | null {
  const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!row) return null;
  const segments = db
    .prepare('SELECT * FROM segments WHERE meeting_id = ? ORDER BY seq')
    .all(id)
    .map(toStoredSegment);
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
    speakers: readSpeakers(db, id),
    notes: parseJson<StoredNotes>(row.notes, { actions: [], decisions: [] }),
    participants: parseJson<string[] | null>(row.participants, null),
    folderId: row.folder_id === null ? null : str(row.folder_id),
    insights: parseJson<InsightSet | null>(row.insights, null),
  };
}
