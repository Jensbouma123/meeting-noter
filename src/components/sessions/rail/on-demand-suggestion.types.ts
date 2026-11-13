import type { FolderSuggestionView } from './folder-suggestion.types';

export interface OnDemandSuggestions {
  views: Record<string, FolderSuggestionView>;
  pendingId: string | null;
  suggest: (meetingId: string) => Promise<void>;
}
