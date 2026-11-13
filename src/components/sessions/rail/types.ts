import type { ReactNode } from 'react';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import type { SessionGroup } from '@/lib/meeting/types/session-groups';
import type { FolderController } from '../folders/types';

export interface SessionSidebarProps {
  activeSessionId?: string | null;
  onOpenSession: (sessionId: string) => void;
  onNewSession: (folderId?: string) => void;
  open: boolean;
  onToggle: () => void;
}

export interface SessionDialogProps {
  session: SessionMetadata | null;
  onClose: () => void;
  onConfirm: (sessionId: string) => void;
}

export interface RailSessionRowProps {
  session: SessionMetadata;
  isActive: boolean;
  onOpen: () => void;
  onClear: () => void;
  onDelete: () => void;
  onMove?: () => void;
  pathLabel?: string;
}

export type RailBadgeState = 'recording' | 'draft' | 'none';

export interface ServerHits {
  query: string;
  ids: Set<string>;
}

export interface RailBodyProps {
  sessions: SessionMetadata[];
  groups: SessionGroup<SessionMetadata>[];
  searching: boolean;
  folderCtl: FolderController;
  renderRow: (session: SessionMetadata, pathLabel?: string) => ReactNode;
  onNewSession: (folderId?: string) => void;
}

export interface RailHeaderProps {
  sessionCount: number;
  open: boolean;
  onNewSession: () => void;
  onToggle: () => void;
}

export interface RailSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export interface CollapsedRailProps {
  onNewSession: () => void;
  onToggle: () => void;
}
