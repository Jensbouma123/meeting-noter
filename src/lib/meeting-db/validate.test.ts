import { describe, expect, it } from 'vitest';
import { sampleMeeting } from './test-meeting';
import { parseStoredMeeting } from './validate';

describe('parseStoredMeeting', () => {
  it('drops partial and malformed lines but keeps the meeting', () => {
    const raw = {
      ...sampleMeeting(),
      segments: [
        { id: 'p', source: 'mic', speaker: 'mic:0', text: 'partial', start: 0, end: 1, final: false },
        { id: 'f', source: 'mic', speaker: 'mic:0', text: 'final', start: 1, end: 2, final: true, words: [] },
        { id: 'bad', source: 'radio', speaker: 'x', text: 'y', start: 0, end: 1 },
      ],
    };
    const parsed = parseStoredMeeting(raw)!;
    expect(parsed.segments.map((s) => s.id)).toEqual(['f']);
    expect(parsed.segments[0]).not.toHaveProperty('words');
  });

  it('cleans participants and reads a missing list as never asked', () => {
    expect(parseStoredMeeting({ ...sampleMeeting(), participants: [' Anna ', 'anna', 3, '', 'Jan'] })!.participants)
      .toEqual(['Anna', 'Jan']);
    const older: Partial<ReturnType<typeof sampleMeeting>> = sampleMeeting();
    delete older.participants;
    expect(parseStoredMeeting(older)!.participants).toBeNull();
    expect(parseStoredMeeting({ ...sampleMeeting(), participants: [] })!.participants).toEqual([]);
  });

  it('refuses ids that are unsafe in a path and missing timestamps', () => {
    expect(parseStoredMeeting({ ...sampleMeeting(), id: '../etc' })).toBeNull();
    expect(parseStoredMeeting({ ...sampleMeeting(), updatedAt: 'now' })).toBeNull();
    expect(parseStoredMeeting(null)).toBeNull();
  });

  it('keeps well-formed lowConfSpans from HTTP input and drops malformed ones', () => {
    const base = sampleMeeting();
    const body = { ...base, segments: [
      { ...base.segments[0], lowConfSpans: [[1, 4, 0.5], [5, 2, 0.5], 'x', [1, 2]] },
      { ...base.segments[1], lowConfSpans: 'bad' },
    ] };
    const parsed = parseStoredMeeting(body);
    expect(parsed?.segments[0].lowConfSpans).toEqual([[1, 4, 0.5]]);
    expect(parsed?.segments[1].lowConfSpans).toBeUndefined();
  });
});
