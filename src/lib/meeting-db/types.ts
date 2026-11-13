import type { CaptureMode, LowConfSpan, SegmentOverlap, Source, Speaker } from '../meeting/types';
import type { Notes } from '../meeting/notes';

/** One final transcript line as the meetings DB stores it (no word timings). */
export interface StoredSegment {
  id: string;
  source: Source;
  speaker: string;
  text: string;
  start: number;
  end: number;
  overlap?: SegmentOverlap;
  /** Words the model was unsure of; nothing reads them since D1 was removed. Absent on meetings saved before v5. */
  lowConfSpans?: LowConfSpan[];
}

/**
 * A whole meeting as `/api/meetings/[id]` sends and accepts it, and as
 * `get_meeting` returns it. `updatedAt` orders writes: the DB keeps the newer.
 */
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
  /** Who was in the meeting; null when nobody was ever asked (an empty list is a skipped question). */
  participants: string[] | null;
  /**
   * The folder it is filed in; null is unfiled. Absent on a PUT means "leave the filing
   * as stored" (a client that knows no folders); `get` always sets it.
   */
  folderId?: string | null;
}

/** A meeting's row without its transcript, for lists. */
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
  /** The folder it is filed in; null is unfiled. */
  folderId: string | null;
}

export interface MeetingSearchHit extends MeetingSummaryRow {
  /** Matching text with the hits wrapped in `[` `]`. */
  snippet: string;
}

/** One node of the folder tree; build the tree from `parentId` (null at the root). */
export interface FolderRow {
  id: string;
  parentId: string | null;
  name: string;
  /** Order among siblings, ascending. */
  sort: number;
  createdAt: number;
  updatedAt: number;
}
