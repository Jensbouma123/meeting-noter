import { useCallback, useState } from 'react';
import { useToast } from '@jensbouma123/acciva-ui';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { deleteSession } from '@/lib/meeting/session-store';
import {
  createFolder,
  deleteFolder,
  moveFolder,
  moveMeeting,
  renameFolder,
  type ApiResult,
  type FolderDeleteMode,
} from '@/lib/folders/folders-api';
import { canMoveFolder, folderSubtreeIds } from '@/lib/folders/folder-tree';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { MoveToDialog } from './MoveToDialog';
import { useFolderData } from './useFolderData';
import { useFolderReorder } from './useFolderReorder';
import { useFoldersT } from './useFoldersT';
import type { FolderController, MoveTarget } from './types';

export function useFolderController(sessions: readonly SessionMetadata[]): FolderController {
  const t = useFoldersT();
  const { toast } = useToast();
  const { folders, setFolders, meetingFolders, refresh } = useFolderData(sessions);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderRow | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);

  const report = useCallback(
    (r: ApiResult<object>): boolean => {
      if (r.ok) return true;
      toast.warning(r.error === 'cycle' ? t('moveIntoItself') : r.error === 'bad-name' ? t('nameRequired') : t('errorGeneric'));
      return false;
    },
    [toast, t],
  );
  const reorder = useFolderReorder({ folders, setFolders, report, refresh });

  const addFolder = useCallback((parentId: string | null) => setCreateParentId(parentId), []);
  const createNewFolder = useCallback(async (name: string, parentId: string | null) => {
    const normalized = name.trim().toLocaleLowerCase();
    if (!normalized || folders.some((folder) => folder.parentId === parentId && folder.name.trim().toLocaleLowerCase() === normalized)) return false;
    const result = await createFolder(name.trim(), parentId);
    if (!report(result) || !result.ok) return false;
    setCreateParentId(undefined);
    return true;
  }, [folders, report]);
  const rename = useCallback(
    async (id: string, name: string) => {
      setRenamingId(null);
      const current = folders.find((f) => f.id === id);
      if (!name.trim() || name.trim() === current?.name) return;
      report(await renameFolder(id, name));
    },
    [folders, report],
  );
  const dropMeeting = useCallback(
    async (meetingId: string, folderId: string | null) => {
      if ((meetingFolders[meetingId] ?? null) === folderId) return;
      report(await moveMeeting(meetingId, folderId));
    },
    [meetingFolders, report],
  );
  const dropFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      if (!canMoveFolder(folders, folderId, parentId)) return;
      report(await moveFolder(folderId, parentId));
    },
    [folders, report],
  );

  const confirmDelete = useCallback(
    async (mode: FolderDeleteMode) => {
      const target = deleteTarget;
      setDeleteTarget(null);
      if (!target) return;
      const ids = folderSubtreeIds(folders, target.id);
      const r = await deleteFolder(target.id, mode);
      if (!report(r)) return;
      if (mode === 'delete-contents') {
        for (const [meetingId, fid] of Object.entries(meetingFolders)) {
          if (fid && ids.has(fid)) deleteSession(meetingId, { deletedOnServer: true });
        }
        window.dispatchEvent(new Event('mn:sessions-changed'));
      }
    },
    [deleteTarget, folders, meetingFolders, report],
  );

  const moveToDestination = useCallback(
    async (target: MoveTarget, dest: string | null) => {
      setMoveTarget(null);
      if (target.kind === 'meeting') await dropMeeting(target.id, dest);
      else await dropFolder(target.id, dest);
    },
    [dropMeeting, dropFolder],
  );

  const dialogs = (
    <>
      {createParentId !== undefined && (
        <CreateFolderDialog
          initialParentId={createParentId}
          folders={folders}
          onClose={() => setCreateParentId(undefined)}
          onCreate={createNewFolder}
        />
      )}
      <MoveToDialog target={moveTarget} folders={folders} meetingFolders={meetingFolders} onClose={() => setMoveTarget(null)} onMove={moveToDestination} />
      <DeleteFolderDialog
        folder={deleteTarget}
        folders={folders}
        meetingFolders={meetingFolders}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );

  return {
    folders,
    meetingFolders,
    renamingId,
    setRenamingId,
    addFolder,
    rename,
    dropMeeting,
    dropFolder,
    ...reorder,
    requestMove: setMoveTarget,
    requestDelete: setDeleteTarget,
    dialogs,
  };
}
