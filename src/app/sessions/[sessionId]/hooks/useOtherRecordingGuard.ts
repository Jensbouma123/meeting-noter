import { useEffect, useState } from 'react';
import { getTranscriptSessionId, loadIdleSession } from '@/lib/meeting/store';
import { sessionExists, openSession } from '@/lib/meeting/session-store';
import { ensureMeetingLoaded } from '@/lib/meeting/server-sync';

export function useOtherRecordingGuard(initialSessionId?: string): boolean {
  const [otherRecording, setOtherRecording] = useState(false);
  useEffect(() => {
    if (!initialSessionId) return;
    if (getTranscriptSessionId() === initialSessionId) {
      setOtherRecording(false); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    let cancelled = false;
    void ensureMeetingLoaded(initialSessionId).then(() => {
      if (cancelled || getTranscriptSessionId() === initialSessionId) return;
      try {
        const saved = sessionExists(initialSessionId) ? openSession(initialSessionId) : null;
        const loaded = loadIdleSession(
          initialSessionId,
          saved && { segments: saved.segments, speakers: saved.speakers, startedAt: saved.startedAt ?? null },
        );
        setOtherRecording(!loaded);
      } catch {
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialSessionId]);
  return otherRecording;
}
