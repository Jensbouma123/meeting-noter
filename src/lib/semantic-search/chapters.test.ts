import { describe, expect, it } from 'vitest';
import { findChapters } from './chapters';
import { chunkTranscript } from './chunk';
import { createFakeEmbedder } from './fake-embedder';
import { SemanticIndex } from './index';
import { type TranscriptLine } from './types';

function linesOf(texts: string[], seconds = 30): TranscriptLine[] {
  return texts.map((text, i) => ({ start: i * seconds, end: i * seconds + 10, text }));
}

const BUDGET = [
  'the quarterly budget forecast looks tight on revenue',
  'we need to cut spending on contractors this quarter',
  'budget review moves to friday, forecast numbers still rough',
  'revenue is behind plan so the spending freeze stays',
  'finance wants the budget spreadsheet before the forecast call',
  'contractor spending is the biggest line in the quarterly budget',
  'if revenue slips again we revisit the forecast',
  'budget numbers for the next quarter depend on revenue',
];

const HOLIDAY = [
  'summer holiday plans, who is going to the beach this year',
  'the cottage in the dunes is free the second week of july',
  'vakantie naar de kust, de boeken zijn al gedaan',
  'travel insurance for the trip, the flights are booked',
  'beach days and the holiday rental, kids want the pool',
  'we could drive to the coast for the summer vacation',
  'cottage booking confirmed, bring the beach gear',
  'holiday packing list, sunscreen and the travel documents',
];

describe('findChapters', () => {
  it('cuts at the topic change and titles each chapter with its top terms', async () => {
    const embedder = createFakeEmbedder();
    const index = new SemanticIndex(embedder);
    await index.addMeeting('m', linesOf([...BUDGET, ...HOLIDAY]));

    const chapters = index.chapters('m', { minChapterWindows: 3 });
    expect(chapters).toHaveLength(2);
    expect(chapters[0].windowStart).toBe(0);
    expect(Math.abs(chapters[0].windowEnd - BUDGET.length)).toBeLessThanOrEqual(1);
    expect(chapters[1].windowStart).toBe(chapters[0].windowEnd);
    expect(chapters[1].windowEnd).toBe(BUDGET.length + HOLIDAY.length);
    expect(chapters[0].terms).toContain('budget');
    expect(chapters[1].terms.some((t) => ['holiday', 'beach', 'cottage', 'vakantie'].includes(t))).toBe(true);
    expect(chapters[0].title).toBe(chapters[0].terms.join(' · '));
  });

  it('keeps one chapter for a single-topic meeting', async () => {
    const windows = chunkTranscript('m', linesOf(BUDGET));
    const embedder = createFakeEmbedder();
    const vectors = await embedder.embed(windows.map((w) => w.text), 'document');
    const chapters = findChapters('m', windows, vectors, { minChapterWindows: 3 });
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).not.toBe('');
  });

  it('never makes a chapter shorter than the minimum', async () => {
    const texts = [...BUDGET.slice(0, 2), ...HOLIDAY.slice(0, 2), ...BUDGET.slice(2)];
    const windows = chunkTranscript('m', linesOf(texts));
    const vectors = await createFakeEmbedder().embed(windows.map((w) => w.text), 'document');
    const chapters = findChapters('m', windows, vectors, { minChapterWindows: 4 });
    for (const c of chapters) expect(c.windowEnd - c.windowStart).toBeGreaterThanOrEqual(4);
  });

  it('returns no chapters for an empty meeting and rejects mismatched inputs', () => {
    expect(findChapters('m', [], [])).toEqual([]);
    expect(() => findChapters('m', chunkTranscript('m', linesOf(['x'])), [])).toThrow(RangeError);
  });
});
