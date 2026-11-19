import type { SegmentView } from './case-result';

export interface MeetingSegment extends SegmentView {
  kept: boolean;
}

export interface MeetingResult {
  id: string;
  split: 'dev' | 'heldout';
  segments: MeetingSegment[];
}
