import type { SpeakerTurn } from '@/lib/diarization/browser';
import { relabelSource } from './diarization-relabel';
import { replaceTurns, turnsGeneration, turnsOf } from './diarization-turns';
import { noteOverlapTurns } from './overlap-retranscribe';
import { getTranscriptSessionId } from './transcript-session';
import type { Source } from './types';

export function applyRescore(source: Source, turns: readonly SpeakerTurn[]): void {
  replaceTurns(source, turns);
  relabelSource(source);
  noteOverlapTurns(source, turnsOf(source));
}

export function rescoreHandler(source: Source): (turns: readonly SpeakerTurn[]) => void {
  const generation = turnsGeneration();
  const sessionId = getTranscriptSessionId();
  const stillSameMeeting = () => generation === turnsGeneration() && sessionId === getTranscriptSessionId();
  return (turns) => {
    if (stillSameMeeting()) applyRescore(source, turns);
  };
}
