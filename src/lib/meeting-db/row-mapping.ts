import type { SQLOutputValue } from 'node:sqlite';
import type { CaptureMode } from '../meeting/types';
import type { MeetingSummaryRow, SqlRow } from './types';

export const num = (v: SQLOutputValue): number => Number(v);
export const numOrNull = (v: SQLOutputValue): number | null => (v === null ? null : Number(v));
export const str = (v: SQLOutputValue): string => (v === null ? '' : String(v));

export function parseJson<T>(raw: SQLOutputValue, fallback: T): T {
  try {
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const SUMMARY_COLUMNS =
  'm.id, m.title, m.created_at, m.updated_at, m.started_at, m.duration_seconds, m.segment_count, m.capture_mode, m.is_draft, m.speaker_names, m.folder_id';

export function toSummaryRow(row: SqlRow): MeetingSummaryRow {
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
