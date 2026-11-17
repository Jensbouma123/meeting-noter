import type { FolderRow } from '@/lib/meeting-db/types';
import { uniqueNames } from '@/lib/meeting/participant-names';
import type { FolderRoster } from './roster.types';
import type { RosterPlan } from './roster-plan.types';

export function resolveFolderRoster(folders: readonly FolderRow[], folderId: string | null | undefined): FolderRoster {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const seen = new Set<string>();
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (!current.inheritRoster) return { names: current.roster, sourceFolderId: current.id };
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return { names: [], sourceFolderId: null };
}

export function mergeRoster(roster: readonly string[], added: readonly string[]): string[] {
  return uniqueNames([...roster, ...added]);
}

export function newRosterNames(roster: readonly string[], picked: readonly string[]): string[] {
  const known = new Set(roster.map((name) => name.toLowerCase()));
  return picked.filter((name) => !known.has(name.toLowerCase()));
}

export function planRosterSave(
  folders: readonly FolderRow[],
  folderId: string | null | undefined,
  added: readonly string[],
): RosterPlan | null {
  const folder = folderId ? folders.find((item) => item.id === folderId) : undefined;
  if (!folder) return null;
  const resolved = resolveFolderRoster(folders, folder.id);
  const extra = newRosterNames(resolved.names, added);
  if (extra.length === 0) return null;
  if (resolved.sourceFolderId) {
    return {
      folderId: resolved.sourceFolderId,
      roster: mergeRoster(resolved.names, extra),
      inheritRoster: false,
    };
  }
  return { folderId: folder.id, roster: mergeRoster(folder.roster, extra), inheritRoster: false };
}
