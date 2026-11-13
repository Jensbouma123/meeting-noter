import { useCallback } from 'react';
import { meeting } from '@/components/meeting';
import { getState, getTranscriptSessionId } from '@/lib/meeting/store';
import { persistSession, getSessionMetadata } from '@/lib/meeting/session-store';
import { flushAutosave } from '@/lib/meeting/persist';

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
