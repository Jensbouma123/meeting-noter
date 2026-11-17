import type { MeetingSummaryRow, StoredMeeting } from '@/lib/meeting-db/types';
import { adoptNotes, hasLocalNotes } from './notes-storage';
import { adoptParticipants, hasAskedParticipants } from './participants';
import { removeNotesAndParticipants } from './session-notes-cleanup';
import { SESSION_INDEX_VERSION, notifySessionsChanged, readSessionIndex, writeSessionIndex } from './session-index';
import { loadSessionTranscript, removeSessionTranscript, saveSessionTranscript } from './session-transcript-storage';
import type { SessionEntry } from './types/session-store';

function summaryEntry(row: MeetingSummaryRow): SessionEntry {
  return {
    version: SESSION_INDEX_VERSION,
    sessionId: row.id,
    title: row.title,
    segmentCount: row.segmentCount,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDraft: row.isDraft,
    ...(row.captureMode ? { captureMode: row.captureMode } : {}),
  };
}

export function adoptMeetingSummaries(rows: MeetingSummaryRow[]): void {
  if (rows.length === 0) return;
  const index = readSessionIndex();
  const positions = new Map(index.sessions.map((s, i) => [s.sessionId, i]));
  for (const row of rows) {
    const entry = summaryEntry(row);
    const at = positions.get(row.id);
    if (at !== undefined) index.sessions[at] = entry;
    else positions.set(row.id, index.sessions.push(entry) - 1);
  }
  writeSessionIndex(index);
  notifySessionsChanged();
}

export function adoptMeetingSummary(row: MeetingSummaryRow): void {
  adoptMeetingSummaries([row]);
}

export function cacheMeetingContent(meeting: StoredMeeting, opts: { replace?: boolean } = {}): void {
  if (opts.replace || !loadSessionTranscript(meeting.id)) {
    saveSessionTranscript({
      sessionId: meeting.id,
      title: meeting.title,
      segments: meeting.segments.map((s) => ({ ...s, final: true })),
      speakers: meeting.speakers,
      startedAt: meeting.startedAt,
    });
  }
  if (opts.replace || !hasLocalNotes(meeting.id)) adoptNotes(meeting.id, meeting.notes);
  if (meeting.participants !== null && (opts.replace || !hasAskedParticipants(meeting.id))) {
    adoptParticipants(meeting.id, meeting.participants);
  }
}

export function evictMeetingContent(sessionId: string): void {
  removeSessionTranscript(sessionId);
  removeNotesAndParticipants(sessionId);
}

export function adoptStoredMeeting(meeting: StoredMeeting): void {
  adoptMeetingSummary({
    id: meeting.id,
    title: meeting.title,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    startedAt: meeting.startedAt,
    durationSeconds: meeting.durationSeconds,
    segmentCount: meeting.segments.length,
    captureMode: meeting.captureMode,
    isDraft: meeting.segments.length === 0,
    speakers: [],
    folderId: meeting.folderId ?? null,
    folderSuggestionDeclined: [],
  });
  cacheMeetingContent(meeting, { replace: true });
}
