import type { Segment, Speaker } from '../types';

export interface TrackedTranscript {
  segments: Segment[];
  speakers: Record<string, Speaker>;
  revision: number;
}
