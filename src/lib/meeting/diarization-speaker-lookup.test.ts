import { beforeEach, describe, expect, it } from 'vitest';
import { speakerNear } from './diarization-speaker-lookup';
import { clearTurns, insertTurn } from './diarization-turns';

beforeEach(clearTurns);

describe('speakerNear tie-break', () => {
  it('gives an interjection to its speaker when the surrounding turn was paused', () => {
    insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 6, pauses: [[2.8, 3.6]] });
    insertTurn({ source: 'mic', speaker: 'mic:1', start: 2.9, end: 3.5 });
    expect(speakerNear('mic', 3, 3.4)).toBe('mic:1');
  });

  it('still prefers the surrounding turn when it was speaking', () => {
    insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 6 });
    insertTurn({ source: 'mic', speaker: 'mic:1', start: 2.9, end: 3.5 });
    expect(speakerNear('mic', 3, 3.4)).toBe('mic:0');
  });
});
