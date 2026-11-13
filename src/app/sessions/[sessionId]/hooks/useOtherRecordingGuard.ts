import { useEffect, useState } from 'react';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { loadIdleSession } from '@/lib/meeting/session-reset';
import { sessionExists, openSession } from '@/lib/meeting/session-open';
import { ensureMeetingLoaded } from '@/lib/meeting/meeting-loader';

export function useOtherRecordingGuard(initialSessionId?: string): boolean {
  const [verdict, setVerdict] = useState<{ sessionId: string; other: boolean } | null>(null);
  useEffect(() => {
    if (!initialSessionId || getTranscriptSessionId() === initialSessionId) return;
    let cancelled = false;
    void ensureMeetingLoaded(initialSessionId).then(() => {
      if (cancelled || getTranscriptSessionId() === initialSessionId) return;
      try {
        const saved = sessionExists(initialSessionId) ? openSession(initialSessionId) : null;
        const loaded = loadIdleSession(
          initialSessionId,
          saved && { segments: saved.segments, speakers: saved.speakers, startedAt: saved.startedAt ?? null },
        );
        setVerdict({ sessionId: initialSessionId, other: !loaded });
      } catch {
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialSessionId]);
  return verdict !== null && verdict.sessionId === initialSessionId && verdict.other;
}
