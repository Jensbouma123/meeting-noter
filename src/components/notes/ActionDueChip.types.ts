import type { ActionItem } from '@/lib/meeting/types/notes';
import type { NotesTranslate } from './NotesPanel.types';

export interface ActionDueChipProps {
  item: ActionItem;
  t: NotesTranslate;
  sessionId: string;
}
