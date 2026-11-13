import { beforeEach, describe, expect, it } from 'vitest';
import {
  reportSpeakerState,
  seedSpeakerStates,
  speakerSeedFor,
  takeReportedSpeakerStates,
} from './speaker-handoff';
import { serializeSpeakerState } from './speaker-state';

const SHAPE = { hiddenSize: 4, numSpeakers: 2 };

function serializedState() {
  return serializeSpeakerState(
    { numFrames: 1, compressed: true, embeds: new Float32Array([1, 2, 3, 4]), probs: new Float32Array([0, 1]) },
    SHAPE,
  );
}

describe('speaker state hand-off', () => {
  beforeEach(() => seedSpeakerStates(null));

  it('seeds every diarizer of a source until the next recording reseeds', () => {
    const state = serializedState();
    seedSpeakerStates({ mic: state, system: { bogus: true } as never });
    expect(speakerSeedFor('mic')).toBe(state);
    expect(speakerSeedFor('mic')).toBe(state);
    expect(speakerSeedFor('system')).toBeUndefined();
    seedSpeakerStates(null);
    expect(speakerSeedFor('mic')).toBeUndefined();
  });

  it('hands over reported states once, and forgets an earlier recording\'s', () => {
    const state = serializedState();
    reportSpeakerState('system', state);
    expect(takeReportedSpeakerStates()).toEqual({ system: state });
    expect(takeReportedSpeakerStates()).toEqual({});
    reportSpeakerState('mic', state);
    seedSpeakerStates(null);
    expect(takeReportedSpeakerStates()).toEqual({});
  });
});
