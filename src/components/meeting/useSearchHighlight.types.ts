import type { Segment } from '@/lib/meeting';
import type { SearchMatch } from './TranscriptSearch.types';

export interface UseSearchHighlightArgs {
  segments: Segment[];
  query: string;
  matches: SearchMatch[];
  activeMatch: SearchMatch | null;
  clampedActive: number;
  getScrollElement: () => HTMLElement | null;
}
