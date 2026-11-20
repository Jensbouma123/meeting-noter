import type { SeparationStats } from '@/lib/meeting/types/overlap-separate';
import type { SegmentView } from './case-result';

export interface MeetingSegment extends SegmentView {
  kept: boolean;
  label?: string;
  overlap?: boolean;
  block?: number;
  blockKind?: 'turn' | 'overlap';
}

export interface MeetingResult {
  id: string;
  split: 'dev' | 'heldout';
  diarized?: boolean;
  segments: MeetingSegment[];
  separation?: SeparationStats;
}
