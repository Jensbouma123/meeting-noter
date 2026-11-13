import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import type { FolderRow } from '@/lib/meeting-db/types';
import { declineFolderSuggestion, moveMeeting } from '@/lib/folders/folders-api';
import { folderPath } from '@/lib/folders/folder-tree';
import { suggestFolderOnDemand } from '@/lib/semantic-search/folder-suggest/on-demand';
import { loadIndex } from '@/lib/semantic-search/store';
import { useFoldersT } from '../folders/useFoldersT';
import type { OnDemandSuggestions } from './on-demand-suggestion.types';

export function useOnDemandSuggestion(
  folders: readonly FolderRow[],
  meetingFolders: Record<string, string | null>,
): OnDemandSuggestions {
  const t = useFoldersT();
  const { toast } = useToast();
  const [found, setFound] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const clear = useCallback((id: string) => setFound(({ [id]: _drop, ...rest }) => rest), []);

  const suggest = useCallback(
    async (id: string) => {
      if (folders.length === 0) {
        toast.info(t('suggestNoFolders'));
        return;
      }
      setPendingId(id);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = suggestFolderOnDemand(id, meetingFolders, (mid) => loadIndex(mid)?.vectors ?? null);
      setPendingId(null);
      if (!result) {
        toast.info(t('suggestNoMatch'));
        return;
      }
      setFound((prev) => ({ ...prev, [id]: result.folderId }));
    },
    [folders, meetingFolders, toast, t],
  );

  const views = useMemo(() => {
    const out: OnDemandSuggestions['views'] = {};
    for (const [id, folderId] of Object.entries(found)) {
      const folderLabel = folderPath(folders, folderId).join(' / ');
      if (!folderLabel) continue;
      out[id] = {
        folderLabel,
        onAccept: () => {
          clear(id);
          void moveMeeting(id, folderId);
        },
        onDecline: () => {
          clear(id);
          void declineFolderSuggestion(id, folderId);
        },
      };
    }
    return out;
  }, [found, folders, clear]);

  return { views, pendingId, suggest };
}
