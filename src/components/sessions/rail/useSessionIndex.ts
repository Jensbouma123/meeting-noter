import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import { clearSessionTranscript, deleteSession, isSessionRecording, listSessions, type SessionMetadata } from '@/lib/meeting/session-store';
import { purgeExpiredSessions } from '@/lib/meeting/retention';
import { loadSettings } from '@/components/meeting/types';
import { useT } from '@/lib/i18n/useT';

export function useSessionIndex() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setSessions(listSessions());
  }, []);

  useEffect(() => {
    purgeExpiredSessions(loadSettings().retention);
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from session index */
    setSessions(listSessions());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    window.addEventListener('mn:sessions-changed', refresh);
    return () => window.removeEventListener('mn:sessions-changed', refresh);
  }, [refresh]);

  const { toast } = useToast();
  const t = useT('sidebar');
  const remove = useCallback(
    (sessionId: string): boolean => {
      let removed = false;
      try {
        if (isSessionRecording(sessionId)) {
          toast.warning(t('stopBeforeDelete'));
          return false;
        }
        removed = deleteSession(sessionId);
      } catch {
        removed = false;
      }
      refresh();
      return removed;
    },
    [refresh, toast, t]
  );

  const clear = useCallback(
    (sessionId: string): boolean => {
      let cleared = false;
      try {
        cleared = clearSessionTranscript(sessionId);
      } catch {
        cleared = false;
      }
      if (cleared) toast({ title: t('cleared'), variant: 'success' });
      else toast.warning(t('stopBeforeClear'));
      refresh();
      return cleared;
    },
    [refresh, toast, t]
  );

  return { sessions, loaded, refresh, remove, clear };
}
