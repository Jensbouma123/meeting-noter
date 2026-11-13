import type { SearchMatch } from './TranscriptSearch.types';

export interface UseScrollToActiveMatchArgs {
  activeMatch: SearchMatch | null;
  query: string;
  getScrollElement: () => HTMLElement | null;
  onNavigatedAway?: () => void;
}
