import type { Segment } from '@/lib/meeting';

export interface TranscriptTurnActionHandlers {
  createAction: () => void;
  markDecision: () => void;
}

export interface TranscriptTurnProps {
  segment: Segment;
  speakerLabel: string;
  speakerColorIndex: number;
  showHeader?: boolean;
  actions?: TranscriptTurnActionHandlers;
}

export interface TextToken {
  word: boolean;
  value: string;
}
