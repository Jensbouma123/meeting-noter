import type { TranscriptTurnActionHandlers } from './TranscriptTurn.types';

export interface TranscriptTurnActionsProps {
  actions: TranscriptTurnActionHandlers;
}

export type AddedNoteKind = 'action' | 'decision';
