'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  Input,
  Modal,
  Text,
  VStack,
  useToast,
} from '@jensbouma123/acciva-ui';
import { ChevronRight, Folder, FolderInput, FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/session-store';
import { deleteSession } from '@/lib/meeting/session-store';
import { useT } from '@/lib/i18n/useT';
import {
  FOLDERS_CHANGED_EVENT,
  createFolder,
  deleteFolder,
  fetchFolders,
  fetchMeetingFolders,
  moveFolder,
  moveMeeting,
  renameFolder,
  type ApiResult,
  type FolderDeleteMode,
} from '@/lib/folders/folders-api';
import {
  buildFolderTree,
  canMoveFolder,
  countByFolder,
  folderPickerOptions,
  folderSubtreeIds,
  type FolderNode,
} from '@/lib/folders/folder-tree';

/** `folders.*` strings; keys the i18n pane hasn't added yet (see src/i18n/folders-keys.md) fall back to the key. */
export function useFoldersT() {
  return useT('folders');
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-1';
const MEETING_MIME = 'application/x-mn-meeting';
const FOLDER_MIME = 'application/x-mn-folder';

/* -------------------------------------------------------------------------- */
/* Controller: data, mutations and the dialogs they need.                      */
/* -------------------------------------------------------------------------- */

type MoveTarget = { kind: 'meeting'; id: string; title: string } | { kind: 'folder'; id: string; title: string };

export interface FolderController {
  folders: FolderRow[];
  /** meetingId → folderId (null = unfiled). */
  meetingFolders: Record<string, string | null>;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  /** Create a folder (named by the default name) and put it into rename mode. */
  addFolder: (parentId: string | null) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  dropMeeting: (meetingId: string, folderId: string | null) => Promise<void>;
  dropFolder: (folderId: string, parentId: string | null) => Promise<void>;
  requestMove: (target: MoveTarget) => void;
  requestDelete: (folder: FolderRow) => void;
  /** Mount once: the move picker and the delete dialog. */
  dialogs: ReactNode;
}

export function useFolderController(sessions: readonly SessionMetadata[]): FolderController {
  const t = useFoldersT();
  const { toast } = useToast();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [meetingFolders, setMeetingFolders] = useState<Record<string, string | null>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderRow | null>(null);

  const refresh = useCallback(async () => {
    const [f, m] = await Promise.all([fetchFolders(), fetchMeetingFolders()]);
    if (f) setFolders(f);
    if (m) setMeetingFolders(m);
  }, []);

  // Reload on mount, after every folder change, and when the session list changes (new/removed meetings).
  const sessionKey = sessions.map((s) => s.sessionId).join('|');
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- loads server state after mount */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh, sessionKey]);
  useEffect(() => {
    const on = () => void refresh();
    window.addEventListener(FOLDERS_CHANGED_EVENT, on);
    window.addEventListener('mn:sessions-changed', on);
    return () => {
      window.removeEventListener(FOLDERS_CHANGED_EVENT, on);
      window.removeEventListener('mn:sessions-changed', on);
    };
  }, [refresh]);

  const report = useCallback(
    (r: ApiResult<object>): boolean => {
      if (r.ok) return true;
      toast.warning(r.error === 'cycle' ? t('moveIntoItself') : r.error === 'bad-name' ? t('nameRequired') : t('errorGeneric'));
      return false;
    },
    [toast, t],
  );

  const addFolder = useCallback(
    async (parentId: string | null) => {
      const r = await createFolder(t('defaultName'), parentId);
      if (report(r) && r.ok) setRenamingId(r.folder.id);
    },
    [report, t],
  );
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
        // The server dropped these meetings; drop this browser's copies too.
        for (const [meetingId, fid] of Object.entries(meetingFolders)) {
          if (fid && ids.has(fid)) deleteSession(meetingId, { deletedOnServer: true });
        }
        window.dispatchEvent(new Event('mn:sessions-changed'));
      }
    },
    [deleteTarget, folders, meetingFolders, report],
  );

  const doMove = useCallback(
    async (target: MoveTarget, dest: string | null) => {
      setMoveTarget(null);
      if (target.kind === 'meeting') await dropMeeting(target.id, dest);
      else await dropFolder(target.id, dest);
    },
    [dropMeeting, dropFolder],
  );

  const dialogs = (
    <>
      <MoveToDialog target={moveTarget} folders={folders} meetingFolders={meetingFolders} onClose={() => setMoveTarget(null)} onMove={doMove} />
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
    requestMove: setMoveTarget,
    requestDelete: setDeleteTarget,
    dialogs,
  };
}

/* -------------------------------------------------------------------------- */
/* Dialogs                                                                     */
/* -------------------------------------------------------------------------- */

interface MoveToDialogProps {
  target: MoveTarget | null;
  folders: FolderRow[];
  meetingFolders: Record<string, string | null>;
  onClose: () => void;
  onMove: (target: MoveTarget, dest: string | null) => void;
}

/** Keyboard-friendly alternative to drag and drop: a list of destination buttons. */
function MoveToDialog({ target, folders, meetingFolders, onClose, onMove }: MoveToDialogProps) {
  const t = useFoldersT();
  const options = useMemo(() => {
    if (!target) return [];
    const exclude = target.kind === 'folder' ? folderSubtreeIds(folders, target.id) : new Set<string>();
    return folderPickerOptions(folders, exclude);
  }, [target, folders]);
  const current = !target
    ? null
    : target.kind === 'meeting'
      ? (meetingFolders[target.id] ?? null)
      : (folders.find((f) => f.id === target.id)?.parentId ?? null);
  const row = (id: string | null, label: string, depth: number) => (
    <li key={id ?? 'root'}>
      <button
        type="button"
        disabled={id === current}
        aria-current={id === current ? 'true' : undefined}
        onClick={() => target && onMove(target, id)}
        style={{ paddingLeft: `${0.5 + depth}rem` }}
        className={`flex w-full min-w-0 items-center gap-2 rounded-md py-2 pr-2 text-left text-sm hover:bg-surface-hover disabled:opacity-60 ${FOCUS}`}
      >
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{label}</span>
        {id === current && <Badge variant="neutral" size="xs">{t('current')}</Badge>}
      </button>
    </li>
  );
  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={t('moveToTitle').replace('{name}', target?.title ?? '')}
      footer={<Button variant="outline" onClick={onClose}>{t('cancel')}</Button>}
    >
      <ul className="max-h-80 overflow-y-auto" aria-label={t('moveToTitle').replace('{name}', target?.title ?? '')}>
        {row(null, t('topLevel'), 0)}
        {options.map((o) => row(o.id, o.name, o.depth + 1))}
      </ul>
    </Modal>
  );
}

interface DeleteFolderDialogProps {
  folder: FolderRow | null;
  folders: FolderRow[];
  meetingFolders: Record<string, string | null>;
  onClose: () => void;
  onConfirm: (mode: FolderDeleteMode) => void;
}

function DeleteFolderDialog({ folder, folders, meetingFolders, onClose, onConfirm }: DeleteFolderDialogProps) {
  const t = useFoldersT();
  const ids = folder ? folderSubtreeIds(folders, folder.id) : new Set<string>();
  const meetings = Object.values(meetingFolders).filter((f) => f && ids.has(f)).length;
  return (
    <Modal
      open={folder !== null}
      onClose={onClose}
      title={t('deleteTitle')}
      footer={
        <HStack spacing="sm" wrap>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button variant="outline" onClick={() => onConfirm('move-up')}>{t('moveUp')}</Button>
          <Button variant="danger" onClick={() => onConfirm('delete-contents')}>{t('deleteWithContents')}</Button>
        </HStack>
      }
    >
      <VStack spacing="sm">
        <Text size="sm">{t('deleteMoveUpDescription').replace('{name}', folder?.name ?? '')}</Text>
        <Text size="sm" variant="muted">
          {t('deleteWithContentsDescription').replace('{name}', folder?.name ?? '')}
          {meetings > 0 ? ` (${meetings})` : ''}
        </Text>
      </VStack>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Tree                                                                        */
/* -------------------------------------------------------------------------- */

interface FolderTreeProps {
  controller: FolderController;
  sessions: readonly SessionMetadata[];
  /** Renders one meeting row; `draggable` props are applied by the tree. */
  renderSession: (session: SessionMetadata) => ReactNode;
}

function dragProps(mime: string, id: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(mime, id);
      e.dataTransfer.effectAllowed = 'move';
    },
  };
}

/** Wraps a meeting row so it can be dragged onto a folder. */
export function DraggableMeeting({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  return <div {...dragProps(MEETING_MIME, sessionId)}>{children}</div>;
}

export function FolderTree({ controller, sessions, renderSession }: FolderTreeProps) {
  const t = useFoldersT();
  const { folders, meetingFolders, addFolder } = controller;
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const counts = useMemo(() => countByFolder(meetingFolders), [meetingFolders]);
  const byFolder = useMemo(() => {
    const m = new Map<string, SessionMetadata[]>();
    for (const s of sessions) {
      const fid = meetingFolders[s.sessionId];
      if (fid) m.set(fid, [...(m.get(fid) ?? []), s]);
    }
    return m;
  }, [sessions, meetingFolders]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <section aria-label={t('title')} className="border-b border-border-subtle pb-1">
      <HStack justify="between" className="px-3 py-1.5">
        <h3 className="text-xs font-semibold text-muted-foreground">{t('title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('newFolder')}
          aria-label={t('newFolder')}
          leadingIcon={<FolderPlus className="size-4" />}
          onClick={() => void addFolder(null)}
        />
      </HStack>
      <RootDropZone controller={controller} label={t('topLevel')} />
      {tree.length === 0 ? (
        <Text size="xs" variant="muted" className="px-3 py-1">{t('empty')}</Text>
      ) : (
        <ul role="tree" aria-label={t('title')} className="px-1">
          {tree.map((node) => (
            <FolderItem
              key={node.folder.id}
              node={node}
              depth={0}
              controller={controller}
              counts={counts}
              byFolder={byFolder}
              collapsed={collapsed}
              onToggle={toggle}
              renderSession={renderSession}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Appears while something is dragged: drop here to take it out of its folder. */
function RootDropZone({ controller, label }: { controller: FolderController; label: string }) {
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const start = (e: DragEvent) => setDragging(!!e.dataTransfer?.types.some((x) => x === MEETING_MIME || x === FOLDER_MIME));
    const end = () => {
      setDragging(false);
      setOver(false);
    };
    window.addEventListener('dragstart', start);
    window.addEventListener('dragend', end);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragstart', start);
      window.removeEventListener('dragend', end);
      window.removeEventListener('drop', end);
    };
  }, []);
  if (!dragging) return null;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const m = e.dataTransfer.getData(MEETING_MIME);
        const f = e.dataTransfer.getData(FOLDER_MIME);
        if (m) void controller.dropMeeting(m, null);
        else if (f) void controller.dropFolder(f, null);
      }}
      className={`mx-2 mb-1 rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground ${over ? 'border-primary-500 bg-surface-hover' : 'border-border-subtle'}`}
    >
      {label}
    </div>
  );
}

interface FolderItemProps {
  node: FolderNode;
  depth: number;
  controller: FolderController;
  counts: Map<string, number>;
  byFolder: Map<string, SessionMetadata[]>;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  renderSession: (session: SessionMetadata) => ReactNode;
}

function FolderItem({ node, depth, controller, counts, byFolder, collapsed, onToggle, renderSession }: FolderItemProps) {
  const t = useFoldersT();
  const { folder } = node;
  const expanded = !collapsed.has(folder.id);
  const meetings = byFolder.get(folder.id) ?? [];
  const [over, setOver] = useState(false);
  const renaming = controller.renamingId === folder.id;
  const hasContent = node.children.length > 0 || meetings.length > 0;

  return (
    <li role="treeitem" aria-expanded={hasContent ? expanded : undefined} aria-selected={false}>
      <div
        {...dragProps(FOLDER_MIME, folder.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          const m = e.dataTransfer.getData(MEETING_MIME);
          const f = e.dataTransfer.getData(FOLDER_MIME);
          if (m) void controller.dropMeeting(m, folder.id);
          else if (f) void controller.dropFolder(f, folder.id);
        }}
        style={{ paddingLeft: `${depth * 0.75}rem` }}
        className={`group flex items-center gap-1 rounded-md pr-1 ${over ? 'bg-surface-hover outline outline-2 -outline-offset-2 outline-primary-500' : 'hover:bg-surface-hover'}`}
      >
        <button
          type="button"
          onClick={() => onToggle(folder.id)}
          aria-label={(expanded ? t('collapse') : t('expand')).replace('{name}', folder.name)}
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground ${FOCUS}`}
        >
          <ChevronRight className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} aria-hidden="true" />
        </button>
        {renaming ? (
          <RenameInput initial={folder.name} label={t('name')} onDone={(name) => void controller.rename(folder.id, name)} onCancel={() => controller.setRenamingId(null)} />
        ) : (
          <button
            type="button"
            onClick={() => onToggle(folder.id)}
            onKeyDown={(e) => {
              if (e.key === 'F2') controller.setRenamingId(folder.id);
            }}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left text-sm ${FOCUS}`}
          >
            {expanded ? <FolderOpen className="size-4 shrink-0 text-primary-600" aria-hidden="true" /> : <Folder className="size-4 shrink-0 text-primary-600" aria-hidden="true" />}
            <span className="truncate">{folder.name}</span>
            {(counts.get(folder.id) ?? 0) > 0 && <Badge variant="neutral" size="xs">{counts.get(folder.id)}</Badge>}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip={t('actions').replace('{name}', folder.name)}
              aria-label={t('actions').replace('{name}', folder.name)}
              leadingIcon={<MoreHorizontal className="size-4" />}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={<FolderPlus className="size-4" />} onClick={() => void controller.addFolder(folder.id)}>
              {t('newSubfolder')}
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Pencil className="size-4" />} onClick={() => controller.setRenamingId(folder.id)}>
              {t('rename')}
            </DropdownMenuItem>
            <DropdownMenuItem icon={<FolderInput className="size-4" />} onClick={() => controller.requestMove({ kind: 'folder', id: folder.id, title: folder.name })}>
              {t('moveTo')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="danger" icon={<Trash2 className="size-4" />} onClick={() => controller.requestDelete(folder)}>
              {t('deleteFolder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded && hasContent && (
        <ul role="group">
          {node.children.map((child) => (
            <FolderItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              controller={controller}
              counts={counts}
              byFolder={byFolder}
              collapsed={collapsed}
              onToggle={onToggle}
              renderSession={renderSession}
            />
          ))}
          {meetings.map((s) => (
            <li key={s.sessionId} role="none" style={{ paddingLeft: `${(depth + 1) * 0.75 + 0.5}rem` }}>
              <DraggableMeeting sessionId={s.sessionId}>{renderSession(s)}</DraggableMeeting>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function RenameInput({ initial, label, onDone, onCancel }: { initial: string; label: string; onDone: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="min-w-0 flex-1 py-0.5">
      <Input
        size="sm"
        value={value}
        autoFocus
        maxLength={200}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onDone(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onDone(value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}
