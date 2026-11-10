import { beforeEach, describe, expect, it } from 'vitest';
import {
  deserializeSpeakerState,
  reportSpeakerState,
  seedSpeakerStates,
  serializeSpeakerState,
  speakerSeedFor,
  takeReportedSpeakerStates,
} from './speaker-state';

/**
 * The speaker cache's stored form. float16 halves it against the storage
 * quota; the model is q4f16, so the embeddings it produced were fp16-sized
 * already.
 */

const SHAPE = { hiddenSize: 4, numSpeakers: 2 };

function snapshot(values: number[], probs: number[]) {
  return {
    numFrames: values.length / SHAPE.hiddenSize,
    compressed: true,
    embeds: new Float32Array(values),
    probs: new Float32Array(probs),
  };
}

describe('serializeSpeakerState / deserializeSpeakerState', () => {
  it('round-trips a snapshot to float16 precision', () => {
    const values = [0, -0, 1, -1, 0.1, 3.14159, -65504, 1e-6];
    const snap = snapshot(values, [0.9, 0.05, 0.5, 0.001]);
    const text = JSON.stringify(serializeSpeakerState(snap, SHAPE));
    const back = deserializeSpeakerState(JSON.parse(text), SHAPE)!;
    expect(back.numFrames).toBe(2);
    expect(back.compressed).toBe(true);
    // Nearest float16: within half a unit in the last place (11 bits).
    values.forEach((v, i) => expect(Math.abs(back.embeds[i] - v)).toBeLessThanOrEqual(Math.abs(v) * 2 ** -11 + 2 ** -25));
    expect(back.probs[0]).toBeCloseTo(0.9, 3);
    expect(back.probs[3]).toBeCloseTo(0.001, 4);
  });

  it('saturates past float16 range instead of wrapping', () => {
    const back = deserializeSpeakerState(serializeSpeakerState(snapshot([1e6, -1e6, NaN, 0], [0, 0]), SHAPE), SHAPE)!;
    expect(back.embeds[0]).toBe(Infinity);
    expect(back.embeds[1]).toBe(-Infinity);
    expect(back.embeds[2]).toBeNaN();
  });

  it('rejects a state for another model, version or a corrupted payload', () => {
    const state = serializeSpeakerState(snapshot([1, 2, 3, 4], [0, 1]), SHAPE);
    expect(deserializeSpeakerState(state, { hiddenSize: 8, numSpeakers: 2 })).toBeNull();
    expect(deserializeSpeakerState({ ...state, version: 99 }, SHAPE)).toBeNull();
    expect(deserializeSpeakerState({ ...state, numFrames: 2 }, SHAPE)).toBeNull();
    expect(deserializeSpeakerState({ ...state, embeds: '%%%' }, SHAPE)).toBeNull();
    expect(deserializeSpeakerState(null, SHAPE)).toBeNull();
    expect(deserializeSpeakerState('state', SHAPE)).toBeNull();
  });
});

describe('speaker state hand-off', () => {
  beforeEach(() => seedSpeakerStates(null));

  it('seeds every diarizer of a source until the next recording reseeds', () => {
    const state = serializeSpeakerState(snapshot([1, 2, 3, 4], [0, 1]), SHAPE);
    seedSpeakerStates({ mic: state, system: { bogus: true } as never });
    expect(speakerSeedFor('mic')).toBe(state);
    expect(speakerSeedFor('mic')).toBe(state);
    expect(speakerSeedFor('system')).toBeUndefined();
    seedSpeakerStates(null);
    expect(speakerSeedFor('mic')).toBeUndefined();
  });

  it('hands over reported states once, and forgets an earlier recording\'s', () => {
    const state = serializeSpeakerState(snapshot([1, 2, 3, 4], [0, 1]), SHAPE);
    reportSpeakerState('system', state);
    expect(takeReportedSpeakerStates()).toEqual({ system: state });
    expect(takeReportedSpeakerStates()).toEqual({});
    reportSpeakerState('mic', state);
    seedSpeakerStates(null);
    expect(takeReportedSpeakerStates()).toEqual({});
  });
});
