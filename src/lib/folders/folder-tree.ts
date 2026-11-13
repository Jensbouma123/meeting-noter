import type { FolderRow } from '@/lib/meeting-db/types';
import type { FolderNode, PickerOption } from './types';

export function buildFolderTree(folders: readonly FolderRow[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { folder: f, children: [] }]));
  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = nodes.get(f.id)!;
    const parent = f.parentId ? nodes.get(f.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

export function folderPath(folders: readonly FolderRow[], id: string | null | undefined): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: string[] = [];
  const seen = new Set<string>();
  let cur = id ? byId.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function folderSubtreeIds(folders: readonly FolderRow[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function canMoveFolder(folders: readonly FolderRow[], folderId: string, targetId: string | null): boolean {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder || folder.parentId === targetId) return false;
  return targetId === null || !folderSubtreeIds(folders, folderId).has(targetId);
}

export function folderPickerOptions(folders: readonly FolderRow[], exclude: ReadonlySet<string> = new Set()): PickerOption[] {
  const out: PickerOption[] = [];
  const walk = (nodes: FolderNode[], depth: number) => {
    for (const n of nodes) {
      if (exclude.has(n.folder.id)) continue;
      out.push({ id: n.folder.id, name: n.folder.name, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(buildFolderTree(folders), 0);
  return out;
}

export function countByFolder(meetingFolders: Readonly<Record<string, string | null>>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const fid of Object.values(meetingFolders)) if (fid) counts.set(fid, (counts.get(fid) ?? 0) + 1);
  return counts;
}
