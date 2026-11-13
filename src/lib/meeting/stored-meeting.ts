import type { StoredMeeting } from '@/lib/meeting-db/types';
import { loadAutosavedSession } from './autosave';
import { getNotes } from './notes';
import { getStoredParticipants } from './participants';
import { getSessionMetadata } from './session-open';
import { loadSessionTranscript } from './session-transcript-storage';

export function buildStoredMeeting(sessionId: string, now = Date.now()): StoredMeeting | null {
  const meta = getSessionMetadata(sessionId);
  if (!meta) return null;
  let transcript = loadSessionTranscript(sessionId);
  const autosaved = loadAutosavedSession();
  if (autosaved && autosaved.sessionId === sessionId && (!transcript || autosaved.savedAt > transcript.savedAt)) {
    transcript = autosaved;
  }
  const segments = (transcript?.segments ?? []).map(({ id, source, speaker, text, start, end, overlap, lowConfSpans }) => ({
    id, source, speaker, text, start, end, ...(overlap ? { overlap } : {}),
    ...(lowConfSpans?.length ? { lowConfSpans } : {}),
  }));
  return {
    id: sessionId,
    title: meta.title,
    createdAt: meta.createdAt,
    updatedAt: Math.max(now, meta.updatedAt),
    startedAt: transcript?.startedAt ?? null,
    durationSeconds: meta.durationSeconds,
    captureMode: meta.captureMode ?? null,
    isDraft: segments.length === 0,
    segments,
    speakers: transcript?.speakers ?? {},
    notes: getNotes(sessionId),
    participants: getStoredParticipants(sessionId),
  };
}
