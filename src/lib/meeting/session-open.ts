import { loadAutosavedSession } from './autosave';
import { persistSession } from './session-crud';
import { readSessionIndex } from './session-index';
import { loadSessionTranscript } from './session-transcript-storage';
import { getState } from './store-core';
import { getTranscriptSessionId } from './transcript-session';
import type { Segment, Speaker } from './types';
import type { AutosavedSession } from './types/autosave';
import type { SessionMetadata, SessionWithMetadata } from './types/session-store';

export function openSession(sessionId: string): AutosavedSession | null {
  let transcript = loadSessionTranscript(sessionId);
  if (!transcript) {
    const autosaved = loadAutosavedSession();
    if (autosaved && autosaved.sessionId === sessionId) transcript = autosaved;
  }
  if (!transcript || transcript.segments.length === 0) return transcript;

  const entry = readSessionIndex().sessions.find((s) => s.sessionId === sessionId);
  if (entry && entry.segmentCount !== transcript.segments.length) {
    persistSession({
      sessionId,
      segments: transcript.segments,
      speakers: transcript.speakers,
      startedAt: transcript.startedAt,
    });
  }
  return transcript;
}

export function archiveAutosavedSession(): string | null {
  try {
    const autosaved = loadAutosavedSession();
    if (!autosaved) return null;
    return persistSession({
      sessionId: autosaved.sessionId,
      title: autosaved.title,
      segments: autosaved.segments,
      speakers: autosaved.speakers,
      startedAt: autosaved.startedAt,
    });
  } catch {
    return null;
  }
}

export function getFullSession(
  sessionId: string,
  segments?: Segment[],
  speakers?: Record<string, Speaker>,
  startedAt: number | null = null
): SessionWithMetadata | null {
  const entry = readSessionIndex().sessions.find((s) => s.sessionId === sessionId);
  if (!entry) return null;

  if (segments === undefined) {
    const transcript = loadSessionTranscript(sessionId);
    segments = transcript?.segments ?? [];
    speakers = speakers ?? transcript?.speakers;
    startedAt = startedAt ?? transcript?.startedAt ?? null;
  }

  return {
    sessionId: entry.sessionId,
    title: entry.title,
    segments,
    speakers: speakers ?? {},
    startedAt,
    segmentCount: entry.segmentCount,
    durationSeconds: entry.durationSeconds,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  const entry = readSessionIndex().sessions.find((s) => s.sessionId === sessionId);
  if (!entry) return null;
  return {
    sessionId: entry.sessionId,
    title: entry.title,
    segmentCount: entry.segmentCount,
    durationSeconds: entry.durationSeconds,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    isDraft: entry.isDraft,
    captureMode: entry.captureMode,
  };
}

export function sessionExists(sessionId: string): boolean {
  return readSessionIndex().sessions.some((s) => s.sessionId === sessionId);
}

export function sessionHasTranscript(sessionId: string): boolean {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return false;
  const hasFinal = (segs: Segment[] | undefined) => !!segs && segs.some((s) => s && s.final === true);
  if (getTranscriptSessionId() === sessionId && hasFinal(getState().segments)) return true;
  if (hasFinal(loadSessionTranscript(sessionId)?.segments)) return true;
  const autosaved = loadAutosavedSession();
  return !!autosaved && autosaved.sessionId === sessionId && hasFinal(autosaved.segments);
}
