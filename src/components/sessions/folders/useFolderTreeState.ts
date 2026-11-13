import { useCallback, useMemo, useState } from 'react';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { buildFolderTree, countByFolder } from '@/lib/folders/folder-tree';
import { INITIAL_VISIBLE, SHOW_MORE_STEP } from './constants';
import type { FolderController } from './types';

export function useFolderTreeState(controller: FolderController, sessions: readonly SessionMetadata[]) {
  const { folders, meetingFolders } = controller;
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const counts = useMemo(() => countByFolder(meetingFolders), [meetingFolders]);
  const byFolder = useMemo(() => {
    const m = new Map<string, SessionMetadata[]>();
    for (const s of sessions) {
      const fid = meetingFolders[s.sessionId];
      if (fid) m.set(fid, [...(m.get(fid) ?? []), s]);
    }
    for (const list of m.values()) list.sort((a, b) => b.createdAt - a.createdAt);
    return m;
  }, [sessions, meetingFolders]);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const showMore = useCallback(
    (id: string) => setVisible((prev) => ({ ...prev, [id]: (prev[id] ?? INITIAL_VISIBLE) + SHOW_MORE_STEP })),
    [],
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [seenRenamingId, setSeenRenamingId] = useState<string | null>(null);
  if (controller.renamingId !== seenRenamingId) {
    setSeenRenamingId(controller.renamingId);
    const hidden = new Set<string>();
    const byId = new Map(controller.folders.map((f) => [f.id, f]));
    for (let p = byId.get(controller.renamingId ?? '')?.parentId; p; p = byId.get(p)?.parentId) hidden.add(p);
    if ([...hidden].some((id) => collapsed.has(id))) setCollapsed(new Set([...collapsed].filter((id) => !hidden.has(id))));
  }
  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { tree, counts, byFolder, visible, showMore, collapsed, toggle };
}
