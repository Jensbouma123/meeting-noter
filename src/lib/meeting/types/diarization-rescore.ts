import type { Diarizer, SpeakerTurn } from '@/lib/diarization/browser';

/** A diarizer that may report rescored turns after it was flushed; optional until every Diarizer carries it. */
export type RescoringDiarizer = Diarizer & {
  onRescored?: (cb: (turns: SpeakerTurn[]) => void) => () => void;
};
