import { beforeEach, describe, expect, it } from 'vitest';
import { speakerFor } from './diarization-speaker-lookup';
import { clearTurns, insertTurn } from './diarization-turns';
import { activeSpeakerAt } from './overlap-clip-pass';

beforeEach(() => {
  clearTurns();
  insertTurn({ source: 'system', speaker: 'system:0', start: 0, end: 10 });
  insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 10 });
  insertTurn({ source: 'mic', speaker: 'mic:1', start: 4, end: 6 });
  insertTurn({ source: 'mic', speaker: 'mic:1', start: 12, end: 20 });
});

describe('mic bleed slot', () => {
  it('gives a local word during crosstalk to the real local slot, not the bleed slot', () => {
    expect(speakerFor('mic', 4.5, 4.8)).toBe('mic:1');
  });

  it('keeps a word with only the bleed slot active on the bleed slot', () => {
    expect(speakerFor('mic', 2, 2.3)).toBe('mic:0');
  });

  it('keeps the bleed slot out of the overlap pass word attribution', () => {
    const turns = [
      { speaker: 'mic:0', start: 0, end: 10 },
      { speaker: 'mic:1', start: 4, end: 6 },
    ];
    const span = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };
    expect(activeSpeakerAt(4.5, span, [], turns)).toBe('mic:1');
  });

  it('leaves system attribution alone', () => {
    insertTurn({ source: 'system', speaker: 'system:1', start: 4, end: 6 });
    expect(speakerFor('system', 4.5, 4.8)).toBe('system:0');
  });
});
