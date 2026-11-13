import { useEffect, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import { FOLDERS_CHANGED_EVENT, fetchFolders, fetchMeetingFolders } from '@/lib/folders/folders-api';
import { resolveFolderRoster } from '@/lib/folders/roster';

export function useSessionFolderRoster(sessionId?: string) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const load = async () => {
      const [rows, meetingFolders] = await Promise.all([fetchFolders(), fetchMeetingFolders()]);
      if (!alive) return;
      if (rows) setFolders(rows);
      if (meetingFolders) setFolderId(meetingFolders[sessionId] ?? null);
    };
    void load();
    const refresh = () => void load();
    window.addEventListener(FOLDERS_CHANGED_EVENT, refresh);
    window.addEventListener('mn:sessions-changed', refresh);
    return () => {
      alive = false;
      window.removeEventListener(FOLDERS_CHANGED_EVENT, refresh);
      window.removeEventListener('mn:sessions-changed', refresh);
    };
  }, [sessionId]);

  const folder = folderId ? folders.find((item) => item.id === folderId) : undefined;
  return {
    folders,
    folderId,
    folderName: folder?.name ?? null,
    roster: resolveFolderRoster(folders, folderId).names,
  };
}
