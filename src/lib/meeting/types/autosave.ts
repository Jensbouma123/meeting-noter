import type { SpeakerStates } from '@/lib/diarization/browser/types';
import type { Segment, Speaker } from './segment';

export interface AutosaveInput {
  sessionId: string;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt?: number | null;
}

export interface AutosavedSession extends AutosaveInput {
  version: number;
  savedAt: number;
}

export interface StoredSpeakerState {
  version: number;
  sessionId: string;
  savedAt: number;
  sources: SpeakerStates;
}
