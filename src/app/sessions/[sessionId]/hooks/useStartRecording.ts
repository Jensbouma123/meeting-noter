import { useCallback, useRef } from 'react';
import { meeting } from '@/components/meeting';
import { promptBrowserASRDownload } from '@/lib/meeting';
import { bindTranscriptSession, getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { getState } from '@/lib/meeting/store-core';
import { persistSession } from '@/lib/meeting/session-crud';
import { archiveAutosavedSession, getSessionMetadata, sessionHasTranscript } from '@/lib/meeting/session-open';
import { clearAutosavedSession, flushAutosave } from '@/lib/meeting/autosave';
import { getClientSessionId } from '@/lib/meeting/client-session-id';
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
    setTargetPrompt,
    setParticipantsPrompt,
    setLangOverride,
    setResumeCandidate,
  } = params;
  const participantsAnswered = useRef(false);

  const startRecording = useCallback(async () => {
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
    setTargetPrompt,
    setParticipantsPrompt,
    setLangOverride,
    setResumeCandidate,
  ]);

  const markParticipantsAnswered = useCallback(() => {
    participantsAnswered.current = true;
  }, []);

  return { startRecording, markParticipantsAnswered };
}
