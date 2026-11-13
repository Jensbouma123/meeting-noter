import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { FolderRow } from '@/lib/meeting-db/types';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import type { ApiResult, FolderDeleteMode, FolderNode } from '@/lib/folders/types';

export type MoveTarget = { kind: 'meeting'; id: string; title: string } | { kind: 'folder'; id: string; title: string };

export type DragItem = { kind: 'meeting' | 'folder'; id: string };

export type MeetingFolders = Record<string, string | null>;

export interface FolderController {
  folders: FolderRow[];
  meetingFolders: MeetingFolders;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  addFolder: (parentId: string | null) => void;
  rename: (id: string, name: string) => Promise<void>;
  dropMeeting: (meetingId: string, folderId: string | null) => Promise<void>;
  dropFolder: (folderId: string, parentId: string | null) => Promise<void>;
  isSibling: (folderId: string, otherId: string) => boolean;
  beginFolderDrag: (folderId: string) => void;
  previewReorder: (targetId: string) => void;
  commitReorder: () => void;
  requestMove: (target: MoveTarget) => void;
  requestDelete: (folder: FolderRow) => void;
  dialogs: ReactNode;
}

export interface MoveToDialogProps {
  target: MoveTarget | null;
  folders: FolderRow[];
  meetingFolders: MeetingFolders;
  onClose: () => void;
  onMove: (target: MoveTarget, dest: string | null) => void;
}

export interface CreateFolderDialogProps {
  initialParentId: string | null;
  folders: FolderRow[];
  onClose: () => void;
  onCreate: (name: string, parentId: string | null) => Promise<boolean>;
}

export interface DeleteFolderDialogProps {
  folder: FolderRow | null;
  folders: FolderRow[];
  meetingFolders: MeetingFolders;
  onClose: () => void;
  onConfirm: (mode: FolderDeleteMode) => void;
}

export interface FolderTreeProps {
  controller: FolderController;
  sessions: readonly SessionMetadata[];
  renderSession: (session: SessionMetadata) => ReactNode;
  onNewSession?: (folderId: string) => void;
}

export interface FolderItemProps {
  node: FolderNode;
  depth: number;
  controller: FolderController;
  counts: Map<string, number>;
  byFolder: Map<string, SessionMetadata[]>;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  visible: Record<string, number>;
  onShowMore: (id: string) => void;
  renderSession: (session: SessionMetadata) => ReactNode;
  onNewSession?: (folderId: string) => void;
}

export interface RenameInputProps {
  initial: string;
  label: string;
  onDone: (name: string) => void;
  onCancel: () => void;
}

export interface FolderRowMenuProps {
  folder: FolderRow;
  controller: FolderController;
}

export interface FolderReorderInput {
  folders: FolderRow[];
  setFolders: Dispatch<SetStateAction<FolderRow[]>>;
  report: (result: ApiResult<object>) => boolean;
  refresh: () => Promise<void>;
}

export interface FolderRowDropInput {
  folderId: string;
  controller: FolderController;
  expanded: boolean;
  hasContent: boolean;
  onToggle: (id: string) => void;
}
