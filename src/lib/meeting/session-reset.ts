import { activateStagedAppend, cancelAppend } from './append-mode';
import { restorableSegments } from './restored-segment';
import { emit, getState, setState } from './store-core';
import { isCaptureActive, setTranscriptSessionId } from './transcript-session';
import type { CaptureMode, Speaker } from './types';
import type { IdleSnapshot } from './types/idle-snapshot';
import type { Segment } from './types';

const BLANK_SESSION_FIELDS = {
  error: null,
  warning: null,
  callAudioMissing: false,
  language: null,
  stats: null,
};

export function resetSession(mode: CaptureMode): void {
  const keep = activateStagedAppend(getState().segments);
  const current = getState();
  setState({
    mode,
    startedAt: null,
    serverReady: false,
    segments: keep ? current.segments : [],
    speakers: keep ? current.speakers : {},
    ...BLANK_SESSION_FIELDS,
  });
}

export function clearIdleSession(): void {
  const { status, mode } = getState();
  if (status !== 'idle') return;
  cancelAppend();
  resetSession(mode);
  setTranscriptSessionId(null);
}

export function loadIdleSession(sessionId: string, snapshot: IdleSnapshot | null): boolean {
  if (isCaptureActive()) return false;
  cancelAppend();
  const segments = snapshot && Array.isArray(snapshot.segments) ? restorableSegments(snapshot.segments) : [];
  const speakers = snapshot && snapshot.speakers && typeof snapshot.speakers === 'object'
    ? { ...snapshot.speakers }
    : {};
  setTranscriptSessionId(sessionId);
  setState({
    segments,
    speakers,
    startedAt: snapshot && typeof snapshot.startedAt === 'number' ? snapshot.startedAt : null,
    ...BLANK_SESSION_FIELDS,
  });
  return true;
}

export function restoreSnapshot(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  startedAt: number | null = null
): void {
  try {
    const safeSegments = Array.isArray(segments) ? restorableSegments(segments) : [];
    const safeSpeakers = speakers && typeof speakers === 'object' ? { ...speakers } : {};
    setState({
      segments: safeSegments,
      speakers: safeSpeakers,
      startedAt: typeof startedAt === 'number' ? startedAt : getState().startedAt,
    });
  } catch {
    return;
  }
}
