import { isSerializedSpeakerState } from './speaker-state';
import type { SerializedSpeakerState, Source, SpeakerStates } from './types';

const reported = new Map<Source, SerializedSpeakerState>();
const seeds = new Map<Source, SerializedSpeakerState>();

export function reportSpeakerState(source: Source, state: SerializedSpeakerState): void {
  reported.set(source, state);
}

export function takeReportedSpeakerStates(): SpeakerStates {
  const out: SpeakerStates = Object.fromEntries(reported);
  reported.clear();
  return out;
}

export function seedSpeakerStates(states: SpeakerStates | null): void {
  seeds.clear();
  reported.clear();
  for (const [source, state] of Object.entries(states ?? {}) as [Source, SerializedSpeakerState][]) {
    if (isSerializedSpeakerState(state)) seeds.set(source, state);
  }
}

export function speakerSeedFor(source: Source): SerializedSpeakerState | undefined {
  return seeds.get(source);
}
