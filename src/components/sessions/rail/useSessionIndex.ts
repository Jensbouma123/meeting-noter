import { useCallback, useEffect, useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useToast } from '@jensbouma123/acciva-ui';
import { clearSessionTranscript, deleteSession, isSessionRecording } from '@/lib/meeting/session-delete';
import { listSessions } from '@/lib/meeting/session-crud';
import { type SessionMetadata } from '@/lib/meeting/types/session-store';
import { purgeExpiredSessions } from '@/lib/meeting/retention';
import { loadSettings } from '@/components/meeting/settingsStorage';
import { useT } from '@/lib/i18n/useT';

export function useSessionIndex() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setSessions(listSessions());
  }, []);

  useOnMount(() => {
    purgeExpiredSessions(loadSettings().retention);
    setSessions(listSessions());
    setLoaded(true);
  });

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
