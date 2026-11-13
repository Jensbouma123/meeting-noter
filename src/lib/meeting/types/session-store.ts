import type { CaptureMode } from './basics';
import type { Segment, Speaker } from './segment';

export interface SessionEntry {
  version: number;
  sessionId: string;
  title: string;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  isDraft?: boolean;
  captureMode?: CaptureMode;
}

export interface SessionIndex {
  version: number;
  sessions: SessionEntry[];
}

export interface SessionMetadata {
  sessionId: string;
  title: string;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  isDraft?: boolean;
  captureMode?: CaptureMode;
}

export interface SessionWithMetadata {
  sessionId: string;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt: number | null;
  segmentCount: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSessionInput {
  sessionId?: string;
  title?: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt?: number | null;
}

export type RecordInSessionMode = 'append' | 'new';
