import type { MeetingsDb } from '../lib/meeting-db/db';

export function folderScope(db: MeetingsDb, folderId?: string, includeSubfolders?: boolean): Set<string> | null {
  if (folderId === undefined) return null;
  const folders = db.listFolders();
  const included = new Set([folderId]);
  if (includeSubfolders) {
    for (const folder of folders) {
      let parentId = folder.parentId;
      while (parentId !== null) {
        if (parentId === folderId) {
          included.add(folder.id);
          break;
        }
        parentId = folders.find((candidate) => candidate.id === parentId)?.parentId ?? null;
      }
    }
  }
  return included;
}
