import type { FolderRow } from '@/lib/meeting-db/types';

export interface FakeServerState {
  folders: FolderRow[];
  meetings: Record<string, string | null>;
  nextId: number;
}

export interface RecordedCall {
  url: string;
  method: string;
  body?: string;
}

export type RequestBody = Record<string, unknown>;
