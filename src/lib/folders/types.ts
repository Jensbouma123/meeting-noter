import type { FolderRow } from '@/lib/meeting-db/types';

export interface FolderNode {
  folder: FolderRow;
  children: FolderNode[];
}

export interface PickerOption {
  id: string;
  name: string;
  depth: number;
}

export type FolderDeleteMode = 'move-up' | 'delete-contents';

export type ApiResult<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string };

export type MockReply = Response | Error;
