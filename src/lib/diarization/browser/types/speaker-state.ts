import type { Source } from './source';

export interface SerializedSpeakerState {
  version: number;
  hiddenSize: number;
  numSpeakers: number;
  numFrames: number;
  compressed: boolean;
  embeds: string;
  probs: string;
}

export type SpeakerStates = Partial<Record<Source, SerializedSpeakerState>>;

export interface SpeakerStateShape {
  hiddenSize: number;
  numSpeakers: number;
}
