import { indexKey, removeIndex } from '@/lib/semantic-search/store';
import { clearAutosavedSession, cancelPendingAutosave, loadAutosavedSession } from './autosave';
import { resetDiarization } from './diarization-bridge';
import { notesKey } from './notes-storage';
import { isSessionParticipantsKey, sessionParticipantsKey } from './participants';
import { removeNotesAndParticipants } from './session-notes-cleanup';
import { clearIdleSession } from './session-reset';
import { notifySessionsChanged, readSessionIndex, writeSessionIndex } from './session-index';
import { removeSessionTranscript, sessionTranscriptKey } from './session-transcript-storage';
import { removeSpeakerState, speakerStateKey } from './speaker-state-storage';
import { queueMeetingClear, queueMeetingDelete } from './sync-queue';
import { bindTranscriptSession, getTranscriptSessionId, isCaptureActive } from './transcript-session';

export function isSessionRecording(sessionId: string): boolean {
  return isCaptureActive() && getTranscriptSessionId() === sessionId;
}

function removeMeetingCaches(sessionId: string, opts: { notes: boolean }): void {
  removeIndex(sessionId);
  if (opts.notes) removeNotesAndParticipants(sessionId);
}

export function sweepMeetingStorage(keepSessionId: string | null): void {
  try {
    const keep = new Set<string>();
    if (keepSessionId) {
      for (const k of [sessionTranscriptKey(keepSessionId), speakerStateKey(keepSessionId), notesKey(keepSessionId), indexKey(keepSessionId), sessionParticipantsKey(keepSessionId)]) keep.add(k);
    }
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || keep.has(key)) continue;
      if (/^mn\.(session\.|speaker-state\.|notes\.v1\.|semindex\.)/.test(key) || key === 'mn.semindex.ids.v1' || isSessionParticipantsKey(key)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    return;
  }
}

function dropOrphanedAutosave(sessionId: string, remainingIds: string[]): void {
  try {
    const autosaved = loadAutosavedSession();
    const orphaned =
      autosaved &&
      autosaved.sessionId !== getTranscriptSessionId() &&
      !remainingIds.includes(autosaved.sessionId);
    if (autosaved && (autosaved.sessionId === sessionId || orphaned)) {
      clearAutosavedSession();
    }
  } catch {
    return;
  }
}

export function deleteSession(sessionId: string, opts: { deletedOnServer?: boolean } = {}): boolean {
  if (isSessionRecording(sessionId)) return false;
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx >= 0) {
    index.sessions.splice(existingIdx, 1);
    writeSessionIndex(index);
    notifySessionsChanged();
  }
  cancelPendingAutosave(sessionId);
  removeSessionTranscript(sessionId);
  removeSpeakerState(sessionId);
  removeMeetingCaches(sessionId, { notes: true });
  if (!opts.deletedOnServer) queueMeetingDelete(sessionId);

  if (getTranscriptSessionId() === sessionId) clearIdleSession();

  dropOrphanedAutosave(sessionId, index.sessions.map((s) => s.sessionId));
  return existingIdx >= 0;
}

function clearAutosaveOwnedBy(sessionId: string): void {
  try {
    const autosaved = loadAutosavedSession();
    if (autosaved && autosaved.sessionId === sessionId) clearAutosavedSession();
  } catch {
    return;
  }
}

export function clearSessionTranscript(sessionId: string): boolean {
  if (isSessionRecording(sessionId)) return false;
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return false;

  index.sessions[existingIdx] = {
    ...index.sessions[existingIdx],
    segmentCount: 0,
    durationSeconds: null,
    isDraft: true,
    updatedAt: Date.now(),
  };
  writeSessionIndex(index);
  cancelPendingAutosave(sessionId);
  removeSessionTranscript(sessionId);
  removeMeetingCaches(sessionId, { notes: false });
  removeSpeakerState(sessionId);
  queueMeetingClear(sessionId);

  clearAutosaveOwnedBy(sessionId);

  if (getTranscriptSessionId() === sessionId) {
    clearIdleSession();
    bindTranscriptSession(sessionId);
    resetDiarization();
  }
  notifySessionsChanged();
  return true;
}
