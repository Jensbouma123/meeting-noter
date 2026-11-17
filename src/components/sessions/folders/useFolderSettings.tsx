import { useCallback, useState } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import { updateFolderContext, updateFolderRoster } from '@/lib/folders/folders-api';
import { FolderSettingsDialog } from './FolderSettingsDialog';
import type { FolderSettingsInput, FolderSettingsState } from './types';

export function useFolderSettings({ folders, report }: FolderSettingsInput): FolderSettingsState {
  const [target, setTarget] = useState<FolderRow | null>(null);
  const requestSettings = useCallback((folder: FolderRow) => setTarget(folder), []);
  const save = useCallback(
    async (roster: string[], inheritRoster: boolean, context: string) => {
      if (!target) return;
      const rosterChanged = inheritRoster !== target.inheritRoster || roster.join('\n') !== target.roster.join('\n');
      if (rosterChanged && !(await report(await updateFolderRoster(target.id, roster, inheritRoster)))) return;
      if (context.trim() !== target.context && !(await report(await updateFolderContext(target.id, context)))) return;
      setTarget(null);
    },
    [target, report],
  );

  const dialog = target ? (
    <FolderSettingsDialog
      folder={target}
      folders={folders}
      onClose={() => setTarget(null)}
      onSave={(roster, inheritRoster, context) => void save(roster, inheritRoster, context)}
    />
  ) : null;

  return { requestSettings, dialog };
}
