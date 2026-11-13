import type { SQLOutputValue } from 'node:sqlite';
import type { CaptureMode, LowConfSpan, SegmentOverlap, Source, Speaker } from '../meeting/types';
import type { Notes } from '../meeting/types/notes';

export interface StoredSegment {
  id: string;
  source: Source;
  speaker: string;
  text: string;
  start: number;
  end: number;
  overlap?: SegmentOverlap;
  lowConfSpans?: LowConfSpan[];
}

export interface StoredMeeting {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  durationSeconds: number | null;
  captureMode: CaptureMode | null;
  isDraft: boolean;
  segments: StoredSegment[];
  speakers: Record<string, Speaker>;
  notes: Notes;
  participants: string[] | null;
  folderId?: string | null;
}

export interface MeetingSummaryRow {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  durationSeconds: number | null;
  segmentCount: number;
  captureMode: CaptureMode | null;
  isDraft: boolean;
  speakers: string[];
  folderId: string | null;
}

export interface MeetingSearchHit extends MeetingSummaryRow {
  snippet: string;
}

export interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  sort: number;
  createdAt: number;
  updatedAt: number;
}

export type FolderErrorCode = 'not-found' | 'bad-name' | 'bad-parent' | 'cycle';

export type FolderDeleteMode = 'move-up' | 'delete-contents';

export type UpsertResult = 'written' | 'stale' | 'deleted';

export type SqlRow = Record<string, SQLOutputValue>;

export interface UpsertOptions {
  onlyIfNewer?: boolean;
  markdownFile?: string | null;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  includeDrafts?: boolean;
}

export interface SearchOptions {
  limit?: number;
}

export interface MeetingDeleteResult {
  deleted: boolean;
  markdownFile: string | null;
}

export interface FolderDeleteResult {
  folders: number;
  meetings: number;
  markdownFiles: string[];
}

export interface DeleteAllResult {
  count: number;
  markdownFiles: string[];
}

export type JsonBody = { ok: true; value: unknown } | { ok: false; response: Response };

export interface StoredNotes {
  actions: Notes['actions'];
  decisions: Notes['decisions'];
}

export interface UpsertOutcome {
  result: UpsertResult;
  shrunk: boolean;
}
