import { clearAutosavedSession, flushAutosave } from './autosave';
import { armAppend } from './append-mode';
import { createDraftSession, persistSession } from './session-crud';
import { archiveAutosavedSession, openSession } from './session-open';
import { clearIdleSession, loadIdleSession } from './session-reset';
import { getState } from './store-core';
import { bindTranscriptSession, getTranscriptSessionId, isCaptureActive } from './transcript-session';
import type { RecordInSessionMode } from './types/session-store';

function appendToSession(sessionId: string): string | null {
  const s = getState();
  if (getTranscriptSessionId() !== sessionId || s.segments.length === 0) {
    const transcript = openSession(sessionId);
    if (!transcript || transcript.segments.length === 0) return null;
    if (!loadIdleSession(sessionId, { ...transcript, startedAt: transcript.startedAt ?? null })) return null;
  } else {
    persistSession({ sessionId, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
  }
  bindTranscriptSession(sessionId);
  if (!armAppend()) return null;
  return sessionId;
}

function startFreshSession(sessionId: string, title: string): string {
  const s = getState();
  if (getTranscriptSessionId() === sessionId && s.segments.length > 0) {
    persistSession({ sessionId, segments: s.segments, speakers: s.speakers, startedAt: s.startedAt });
  }
  clearAutosavedSession();
  clearIdleSession();
  const freshId = createDraftSession(title);
  bindTranscriptSession(freshId);
  return freshId;
}

export function startRecordingInSession(
  sessionId: string,
  mode: RecordInSessionMode,
  opts: { title?: string } = {}
): string | null {
  if (isCaptureActive()) return null;
  flushAutosave();
  archiveAutosavedSession();

  if (mode === 'append') return appendToSession(sessionId);
  return startFreshSession(sessionId, opts.title ?? 'Untitled meeting');
}
