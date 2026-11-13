import { useCallback, useEffect, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { FOLDERS_CHANGED_EVENT, fetchFolders, fetchMeetingFolders } from '@/lib/folders/folders-api';
import type { MeetingFolders } from './types';

export function useFolderData(sessions: readonly SessionMetadata[]) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [meetingFolders, setMeetingFolders] = useState<MeetingFolders>({});

  const refresh = useCallback(async () => {
    const [f, m] = await Promise.all([fetchFolders(), fetchMeetingFolders()]);
    if (f) setFolders(f);
    if (m) setMeetingFolders(m);
  }, []);

  const sessionKey = sessions.map((s) => s.sessionId).join('|');
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- loads server state after mount */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh, sessionKey]);
  useEffect(() => {
    const on = () => void refresh();
    window.addEventListener(FOLDERS_CHANGED_EVENT, on);
    window.addEventListener('mn:sessions-changed', on);
    return () => {
      window.removeEventListener(FOLDERS_CHANGED_EVENT, on);
      window.removeEventListener('mn:sessions-changed', on);
    };
  }, [refresh]);

  return { folders, setFolders, meetingFolders, refresh };
}
