import { useCallback, useRef } from 'react';
import { reorderFolder } from '@/lib/folders/folders-api';
import type { FolderReorderInput } from './types';

export function useFolderReorder({ folders, setFolders, report, refresh }: FolderReorderInput) {
  const dragFolderId = useRef<string | null>(null);
  const reordered = useRef(false);

  const beginFolderDrag = useCallback((folderId: string) => {
    dragFolderId.current = folderId;
    reordered.current = false;
  }, []);
  const isSibling = useCallback(
    (a: string, b: string) => {
      const fa = folders.find((f) => f.id === a);
      const fb = folders.find((f) => f.id === b);
      return !!fa && !!fb && fa.parentId === fb.parentId;
    },
    [folders],
  );
  const previewReorder = useCallback((targetId: string) => {
    const dragId = dragFolderId.current;
    if (!dragId || dragId === targetId) return;
    setFolders((prev) => {
      const dragged = prev.find((f) => f.id === dragId);
      const target = prev.find((f) => f.id === targetId);
      if (!dragged || !target || dragged.parentId !== target.parentId) return prev;
      const from = prev.indexOf(dragged);
      const rest = prev.filter((f) => f !== dragged);
      const at = rest.indexOf(target) + (from < prev.indexOf(target) ? 1 : 0);
      reordered.current = true;
      return [...rest.slice(0, at), dragged, ...rest.slice(at)];
    });
  }, [setFolders]);
  const commitReorder = useCallback(() => {
    const dragId = dragFolderId.current;
    dragFolderId.current = null;
    if (!dragId || !reordered.current) return;
    reordered.current = false;
    const dragged = folders.find((f) => f.id === dragId);
    if (!dragged) return;
    const index = folders.filter((f) => f.parentId === dragged.parentId).findIndex((f) => f.id === dragId);
    void reorderFolder(dragId, index).then((r) => {
      if (!report(r)) void refresh();
    });
  }, [folders, report, refresh]);

  return { beginFolderDrag, isSibling, previewReorder, commitReorder };
}
