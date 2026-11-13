import type { Segment, Speaker } from './segment';

export interface IdleSnapshot {
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt: number | null;
}
