import { afterEach, describe, expect, it } from 'vitest';
import { attributeSpeakers } from './speaker-attribution';
import { mergeFamily } from './speaker-family';
import { setOverlapTimeline } from './speaker-overlap-timeline';
import { splitBySpeaker } from './speaker-split';
import { line, turnsAt } from './speaker-test-helpers';
import type { OverlapAt } from './types/speaker-attribution';

afterEach(() => {
  setOverlapTimeline(null);
});

describe('overlapping speech', () => {
  const overlap = { start: 12, end: 14, speakers: ['mic:0', 'mic:1'] };
  const overlaps: OverlapAt = (a, b) => (a < overlap.end && b > overlap.start ? [overlap] : []);
  const primary = turnsAt([['mic:0', 9, 12.9], ['mic:1', 13, 17]]);

  it('cuts the overlap\'s words into parts of their own, each still one speaker\'s', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10);
    const parts = splitBySpeaker(seg, primary, undefined, overlaps);

    expect(parts.map((p) => [p.id, p.speaker, p.text, !!p.overlap])).toEqual([
      ['s1', 'mic:0', 'a b', false],
      ['s1~2', 'mic:0', 'c', true],
      ['s1~3', 'mic:1', 'd', true],
      ['s1~4', 'mic:1', 'e f', false],
    ]);
    expect(parts[1].overlap).toEqual(overlap);
    expect(parts[0]).not.toHaveProperty('overlap');
  });

  it('marks a whole line that lies inside an overlap, and clears it once the overlap is gone', () => {
    const seg = line('s1', ['c', 'd'], 12, 'mic:1');
    const [inside] = splitBySpeaker(seg, () => 'mic:1', undefined, overlaps);
    expect(inside).toMatchObject({ speaker: 'mic:1', overlap });

    const [after] = splitBySpeaker(inside, () => 'mic:1', undefined, () => []);
    expect(after).not.toHaveProperty('overlap');
    expect(splitBySpeaker(inside, () => 'mic:1', undefined, overlaps)[0]).toBe(inside);
  });

  it('leaves overlap alone without a lookup, and a merged family drops it to be found again', () => {
    const parts = splitBySpeaker(line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10), primary, undefined, overlaps);
    expect(splitBySpeaker(parts[1], () => 'mic:0')[0]).toBe(parts[1]);
    expect(mergeFamily(parts)).not.toHaveProperty('overlap');
  });

  it('attributeSpeakers keeps its three-argument call, reading the installed overlap lookup', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10);
    expect(attributeSpeakers(seg, primary, primary).some((p) => p.overlap)).toBe(false);

    const asked: string[] = [];
    setOverlapTimeline((source, a, b) => {
      asked.push(source);
      return overlaps(a, b);
    });
    const parts = attributeSpeakers(seg, primary, primary);
    expect(asked[0]).toBe('mic');
    expect(parts.filter((p) => p.overlap).map((p) => [p.speaker, p.text])).toEqual([
      ['mic:0', 'c'],
      ['mic:1', 'd'],
    ]);
  });
});
