import type { FolderRow } from '@/lib/meeting-db/types';
import type { ApiResult } from './types';
import { updateFolderRoster } from './folders-api';
import { planRosterSave } from './roster';

export async function rememberRosterNames(
  folders: readonly FolderRow[],
  folderId: string | null | undefined,
  picked: readonly string[],
): Promise<ApiResult<{ folder: FolderRow }> | null> {
  const plan = planRosterSave(folders, folderId, picked);
  if (!plan) return null;
  return updateFolderRoster(plan.folderId, plan.roster, plan.inheritRoster);
}
