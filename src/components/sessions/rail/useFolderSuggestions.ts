import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import { FOLDERS_CHANGED_EVENT, declineFolderSuggestion, fetchDeclinedSuggestions, moveMeeting } from '@/lib/folders/folders-api';
import { folderPath } from '@/lib/folders/folder-tree';
import { computeFolderSuggestions } from '@/lib/semantic-search/folder-suggest/compute';
import { loadIndex } from '@/lib/semantic-search/store';
import type { FolderSuggestionView } from './folder-suggestion.types';

export function useFolderSuggestions(
  sessions: readonly SessionMetadata[],
  folders: readonly FolderRow[],
  meetingFolders: Record<string, string | null>,
): Record<string, FolderSuggestionView> {
  const [declined, setDeclined] = useState<Record<string, string[]>>({});
  const refresh = useCallback(async () => {
    const next = await fetchDeclinedSuggestions();
    if (next) setDeclined(next);
  }, []);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- loads server state after mount */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener(FOLDERS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FOLDERS_CHANGED_EVENT, refresh);
  }, [refresh]);

  const sessionKey = sessions.map((s) => s.sessionId).join('|');
  const suggestions = useMemo(
    () =>
      computeFolderSuggestions({
        sessionIds: sessionKey ? sessionKey.split('|') : [],
        meetingFolders,
        declined,
        loadVectors: (id) => loadIndex(id)?.vectors ?? null,
      }),
    [sessionKey, meetingFolders, declined],
  );

  return useMemo(() => {
    const out: Record<string, FolderSuggestionView> = {};
    for (const [id, { folderId }] of Object.entries(suggestions)) {
      const folderLabel = folderPath(folders, folderId).join(' / ');
      if (!folderLabel) continue;
      out[id] = {
        folderLabel,
        onAccept: () => void moveMeeting(id, folderId),
        onDecline: () => {
          setDeclined((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), folderId] }));
          void declineFolderSuggestion(id, folderId);
        },
      };
    }
    return out;
  }, [suggestions, folders]);
}
