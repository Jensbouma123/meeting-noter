import type { Segment } from '@/lib/meeting';

export interface SearchMatch {
  segId: string;
  start: number;
  end: number;
}

export interface TranscriptSearchProps {
  segments: Segment[];
  getScrollElement: () => HTMLElement | null;
  onClose: () => void;
  onNavigatedAway?: () => void;
}
