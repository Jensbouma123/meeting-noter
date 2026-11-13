import type { Speaker } from '@/lib/meeting/types';
import type { Insight } from '@/lib/semantic-search/insights/types/insight';
import type { NotesTranslate } from './NotesPanel.types';

export interface InsightSuggestionsProps {
  sessionId: string;
  speakers: Speaker[];
  t: NotesTranslate;
}

export interface InsightRowProps {
  insight: Insight;
  speakerLabel: string;
  t: NotesTranslate;
  onJump: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}
