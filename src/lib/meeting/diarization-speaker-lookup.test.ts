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

describe('speakerNear in the gap between two speakers', () => {
  it('gives words just before a turn onset to the incoming speaker (onset lag), not the one who finished', () => {
    insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 10 });
    insertTurn({ source: 'mic', speaker: 'mic:1', start: 11, end: 20 });
    // "In deze video probeer ik" sits 0.3s after A's turn ended and 0.7s before B's onset.
    expect(speakerNear('mic', 10.3, 10.6)).toBe('mic:1');
  });

  it('keeps words that trail right after a turn with that turn when the next onset is far away', () => {
    insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 10 });
    insertTurn({ source: 'mic', speaker: 'mic:1', start: 15, end: 20 });
    expect(speakerNear('mic', 10.1, 10.4)).toBe('mic:0');
  });
});
