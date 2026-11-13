import { useCallback, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import { updateFolderRoster } from '@/lib/folders/folders-api';
import { FolderSettingsDialog } from './FolderSettingsDialog';
import type { FolderSettingsInput, FolderSettingsState } from './types';

export function useFolderSettings({ folders, report }: FolderSettingsInput): FolderSettingsState {
  const [target, setTarget] = useState<FolderRow | null>(null);
  const requestSettings = useCallback((folder: FolderRow) => setTarget(folder), []);
  const save = useCallback(
    async (roster: string[], inheritRoster: boolean) => {
      if (!target) return;
      if (await report(await updateFolderRoster(target.id, roster, inheritRoster))) setTarget(null);
    },
    [target, report],
  );

  const dialog = target ? (
    <FolderSettingsDialog
      folder={target}
      folders={folders}
      onClose={() => setTarget(null)}
      onSave={(roster, inheritRoster) => void save(roster, inheritRoster)}
    />
  ) : null;

  return { requestSettings, dialog };
}
