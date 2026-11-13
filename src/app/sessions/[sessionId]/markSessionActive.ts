import { unmarkDraft, setSessionCaptureMode } from '@/lib/meeting/session-crud';
import type { AppSettings } from '@/components/meeting';

export const markSessionActive = (sessionId: string | undefined, mode: AppSettings['mode']) => {
  try {
    if (sessionId) {
      unmarkDraft(sessionId);
      setSessionCaptureMode(sessionId, mode);
    }
  } catch {
    return;
  }
};
