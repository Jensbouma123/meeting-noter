import { useCallback } from 'react';
import { meeting } from '@/components/meeting';
import { getState } from '@/lib/meeting/store-core';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { persistSession, getSessionMetadata } from '@/lib/meeting/session-store';
import { flushAutosave } from '@/lib/meeting/autosave';

const persistFinalTranscript = () => {
  try {
    flushAutosave();
    const s = getState();
    const id = getTranscriptSessionId();
    if (id) {
      persistSession({
        sessionId: id,
        title: getSessionMetadata(id)?.title,
        segments: s.segments,
        speakers: s.speakers,
        startedAt: s.startedAt,
      });
    }
  } catch {
    return;
  }
};

export function useRecordingControls(setLangOverride: (code: string | null) => void) {
  const stopRecording = useCallback(async () => {
    await meeting.stop();
    persistFinalTranscript();
  }, []);

  const pauseRecording = useCallback(() => {
    meeting.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    meeting.resume();
  }, []);

  const pickLanguage = useCallback(
    (code: string) => {
      setLangOverride(code);
      meeting.setLanguage(code);
    },
    [setLangOverride]
  );

  return { stopRecording, pauseRecording, resumeRecording, pickLanguage };
}
