import type { Speaker } from '@/lib/meeting/types';
import type { ActionItem } from '@/lib/meeting/types/notes';
import type { NotesTranslate } from './NotesPanel.types';

export interface ActionOwnerChipProps {
  item: ActionItem;
  speakers: Speaker[];
  t: NotesTranslate;
  sessionId: string;
}
