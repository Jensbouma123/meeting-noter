import type { DiarizerCore } from '@/lib/diarization/browser/core';
import type { SpeakerTurn } from '@/lib/diarization/browser/types';

export interface SpeakerResumeFake {
  cores: Map<string, DiarizerCore>;
  turns: SpeakerTurn[];
}
