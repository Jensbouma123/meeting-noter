import { useEffect } from 'react';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { getSessionMetadata } from '@/lib/meeting/session-store';
import { scheduleAutosave } from '@/lib/meeting/autosave';
import type { AutosaveParams } from '../types';

export function useAutosave({ initialSessionId, title, segments, speakers, startedAt }: AutosaveParams) {
  useEffect(() => {
    try {
      const boundId = getTranscriptSessionId();
      if (!boundId) return;
      const boundTitle =
        boundId === initialSessionId ? title : (getSessionMetadata(boundId)?.title ?? 'Untitled meeting');
      scheduleAutosave({ sessionId: boundId, title: boundTitle, segments, speakers, startedAt });
    } catch {
      return;
    }
  }, [segments, speakers, title, startedAt, initialSessionId]);
}
