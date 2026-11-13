import type { MeetingSummaryRow, StoredMeeting } from '@/lib/meeting-db/types';
import { adoptNotes, hasLocalNotes } from './notes-storage';
import { adoptParticipants, hasAskedParticipants } from './participants';
import { removeNotesAndParticipants } from './session-notes-cleanup';
import { SESSION_INDEX_VERSION, notifySessionsChanged, readSessionIndex, writeSessionIndex } from './session-index';
import { loadSessionTranscript, removeSessionTranscript, saveSessionTranscript } from './session-transcript-storage';
import type { SessionEntry } from './types/session-store';

export function adoptMeetingSummary(row: MeetingSummaryRow): void {
  const index = readSessionIndex();
  const entry: SessionEntry = {
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
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === row.id);
  if (existingIdx >= 0) index.sessions[existingIdx] = entry;
  else index.sessions.push(entry);
  writeSessionIndex(index);
  notifySessionsChanged();
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
