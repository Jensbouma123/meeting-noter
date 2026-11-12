import type { CaptureMode, SegmentOverlap, Source, Speaker } from '../meeting/types';
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
}

export interface MeetingSearchHit extends MeetingSummaryRow {
  /** Matching text with the hits wrapped in `[` `]`. */
  snippet: string;
}
