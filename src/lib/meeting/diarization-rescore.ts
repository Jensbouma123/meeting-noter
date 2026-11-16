import type { SpeakerTurn } from '@/lib/diarization/browser';
import { relabelSource } from './diarization-relabel';
import { replaceTurns, turnsGeneration, turnsOf } from './diarization-turns';
import { noteOverlapTurns } from './overlap-retranscribe';
import { getTranscriptSessionId } from './transcript-session';
import type { Source } from './types';

/** Swaps the source's turns for the rescored ones and relabels all of its segments. */
export function applyRescore(source: Source, turns: readonly SpeakerTurn[]): void {
  replaceTurns(source, turns);
  relabelSource(source);
  noteOverlapTurns(source, turnsOf(source));
}

/**
 * The rescore arrives after the meeting stopped, so it is dropped once the turns were reset
 * (a new recording) or another transcript was opened.
 */
export function rescoreHandler(source: Source): (turns: readonly SpeakerTurn[]) => void {
  const generation = turnsGeneration();
  const sessionId = getTranscriptSessionId();
  return (turns) => {
    if (generation !== turnsGeneration() || sessionId !== getTranscriptSessionId()) return;
    applyRescore(source, turns);
  };
}
