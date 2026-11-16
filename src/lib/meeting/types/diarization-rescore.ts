import type { Diarizer, SpeakerTurn } from '@/lib/diarization/browser';

export type RescoringDiarizer = Diarizer & {
  onRescored?: (cb: (turns: SpeakerTurn[]) => void) => () => void;
};
