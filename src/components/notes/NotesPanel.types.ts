import type { ReactNode } from 'react';
import type { ActionItem, Decision } from '@/lib/meeting/types/notes';
import type { Segment, Speaker } from '@/lib/meeting/types';
import type { NoteSuggestion } from '@/lib/meeting/types/notes';

export interface NotesPanelProps {
  sessionId: string;
  speakers?: Speaker[];
  segments?: Segment[];
}

export type NotesTranslate = (key: string) => string;

export interface NoteSectionProps {
  id: string;
  title: string;
  count: number;
  addLabel: string;
  placeholder: string;
  empty: string;
  onSave: (text: string) => void;
  t: NotesTranslate;
  children: ReactNode;
}

export interface RowMenuProps {
  t: NotesTranslate;
  onEdit?: () => void;
  onDelete: () => void;
  name: string;
}

export interface ActionRowProps {
  item: ActionItem;
  speakers: Speaker[];
  t: NotesTranslate;
  sessionId: string;
}

export interface DecisionRowProps {
  item: Decision;
  sessionId: string;
  t: NotesTranslate;
}

export interface SuggestionsListProps {
  suggestions: NoteSuggestion[];
  sessionId: string;
  t: NotesTranslate;
  onDismiss: (sourceSegmentId: string) => void;
}
