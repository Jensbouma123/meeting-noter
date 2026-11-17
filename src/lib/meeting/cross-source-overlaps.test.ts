import { describe, expect, it } from 'vitest';
import { crossSourceOverlaps } from './cross-source-overlaps';
import { seg } from './export.testUtils';

function words(prefix: string, from: number, to: number) {
  const out = [];
  for (let t = from; t + 0.25 <= to; t += 0.3) out.push({ text: `${prefix}${out.length}`, start: t, end: t + 0.25 });
  return out;
}

describe('crossSourceOverlaps', () => {
  const system = [
    seg({ id: 's1', source: 'system', speaker: 'system:1', start: 12.98, end: 20.98, words: words('a', 13, 20.9) }),
    seg({ id: 's2', source: 'system', speaker: 'system:1', start: 20.98, end: 28.98, words: words('b', 21, 28.9) }),
    seg({ id: 's3', source: 'system', speaker: 'system:1', start: 28.98, end: 36.98, words: words('c', 29, 36.9) }),
  ];
  const halluc = seg({
    id: 'm1',
    source: 'mic',
    speaker: 'mic:0',
    start: 14.2,
    end: 15.6,
    text: 'Bedankt voor het kijken.',
    words: [
      { text: 'Bedankt', start: 14.2, end: 14.6 },
      { text: 'voor', start: 14.6, end: 14.8 },
      { text: 'het', start: 14.8, end: 15 },
      { text: 'kijken.', start: 15, end: 15.6 },
    ],
  });

  it('covers only the time both sources speak, not the whole long segment', () => {
    const marks = crossSourceOverlaps([...system, halluc]);
    const overlap = marks.get(halluc);
    expect(overlap).toMatchObject({ start: 14.2, end: 15.6 });
    expect(overlap?.speakers.sort()).toEqual(['mic:0', 'system:1']);
    expect(marks.get(system[0])).toBe(overlap);
  });

  it('leaves later system segments out of the column', () => {
    const marks = crossSourceOverlaps([...system, halluc]);
    expect(marks.has(system[1])).toBe(false);
    expect(marks.has(system[2])).toBe(false);
  });

  it('marks nothing without a second source', () => {
    expect(crossSourceOverlaps(system).size).toBe(0);
  });
});
