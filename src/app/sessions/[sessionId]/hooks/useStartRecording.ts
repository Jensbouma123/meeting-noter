import { useCallback } from 'react';
import { meeting } from '@/components/meeting';
import { promptBrowserASRDownload } from '@/lib/meeting';
import {
  bindTranscriptSession,
  getTranscriptSessionId,
  getState,
} from '@/lib/meeting/store';
import {
  persistSession,
  archiveAutosavedSession,
  getSessionMetadata,
  sessionHasTranscript,
} from '@/lib/meeting/session-store';
import { clearAutosavedSession, flushAutosave, getClientSessionId } from '@/lib/meeting/persist';
import { hasAskedParticipants } from '@/lib/meeting/participants';
import { buildStartOptions } from '../buildStartOptions';
import { markSessionActive } from '../markSessionActive';
import type { StartRecordingParams } from '../types';

const isDemoUrl = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  } catch {
    return false;
  }
};

const snapshotPreviousRecording = (initialSessionId?: string) => {
  try {
    flushAutosave();
    archiveAutosavedSession();
    const s = getState();
    if (initialSessionId && s.segments.length > 0 && getTranscriptSessionId() === initialSessionId) {
      persistSession({
        sessionId: initialSessionId,
        segments: s.segments,
        speakers: s.speakers,
        startedAt: s.startedAt,
      });
    }
    bindTranscriptSession(initialSessionId ?? getClientSessionId());
    clearAutosavedSession();
  } catch {
    return;
  }
};

export function useStartRecording(params: StartRecordingParams) {
  const {
    initialSessionId,
    settings,
    modelReady,
    modelReadiness,
    status,
    title,
    participantsAnswered,
    setTargetPrompt,
    setParticipantsPrompt,
    setLangOverride,
    setResumeCandidate,
  } = params;

  return useCallback(async () => {
    if (!modelReady) {
      if (modelReadiness !== 'loading' && modelReadiness !== 'downloading') {
        promptBrowserASRDownload();
      }
      return;
    }
    if (initialSessionId && status === 'idle' && sessionHasTranscript(initialSessionId)) {
      const meta = getSessionMetadata(initialSessionId);
      setTargetPrompt({
        title: meta?.title ?? title,
        durationSeconds: meta?.durationSeconds ?? 0,
      });
      return;
    }
    if (
      initialSessionId &&
      !participantsAnswered.current &&
      !hasAskedParticipants(initialSessionId) &&
      !isDemoUrl()
    ) {
      setParticipantsPrompt(true);
      return;
    }
    participantsAnswered.current = false;
    setLangOverride(null);
    setResumeCandidate(null);
    snapshotPreviousRecording(initialSessionId);
    markSessionActive(initialSessionId, settings.mode);
    try {
      await meeting.start(buildStartOptions(settings));
    } catch {
      return;
    }
  }, [
    settings,
    modelReady,
    modelReadiness,
    initialSessionId,
    status,
    title,
    participantsAnswered,
    setTargetPrompt,
    setParticipantsPrompt,
    setLangOverride,
    setResumeCandidate,
  ]);
}
