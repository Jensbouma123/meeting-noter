import { describe, expect, it } from 'vitest';
import { createFakeEmbedder } from './fake-embedder';
import { SemanticIndex } from './index';
import { EMBEDDING_DIM, type TranscriptLine } from './types';

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

describe('SemanticIndex', () => {
  it('ranks the window about the query first, across meetings', async () => {
    const index = new SemanticIndex(createFakeEmbedder());
    await index.addMeeting('budget-meeting', linesOf(BUDGET));
    await index.addMeeting('holiday-meeting', linesOf(HOLIDAY));
    expect(index.size).toBe(2);

    const hits = await index.search('quarterly budget forecast revenue', 3);
    expect(hits).toHaveLength(3);
    expect(hits[0].meetingId).toBe('budget-meeting');
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[1].score);
    expect(hits[1].score).toBeGreaterThanOrEqual(hits[2].score);
  });

  it('finds Dutch text for a Dutch query', async () => {
    const index = new SemanticIndex(createFakeEmbedder());
    await index.addMeeting('budget-meeting', linesOf(BUDGET));
    await index.addMeeting('holiday-meeting', linesOf(HOLIDAY));
    const [top] = await index.search('vakantie kust boeken', 1);
    expect(top.meetingId).toBe('holiday-meeting');
    expect(top.window.text).toContain('vakantie');
  });

  it('replaces a meeting when it is added again and removes it on demand', async () => {
    const index = new SemanticIndex(createFakeEmbedder());
    await index.addMeeting('m', linesOf(BUDGET));
    await index.addMeeting('m', linesOf(HOLIDAY));
    expect(index.size).toBe(1);
    expect(index.removeMeeting('m')).toBe(true);
    expect(index.has('m')).toBe(false);
    expect(await index.search('budget', 3)).toEqual([]);
  });

  it('returns no hits for k <= 0 and an empty index', async () => {
    const index = new SemanticIndex(createFakeEmbedder());
    expect(await index.search('anything', 5)).toEqual([]);
    await index.addMeeting('m', linesOf(BUDGET));
    expect(index.searchVector(new Float32Array(EMBEDDING_DIM), 0)).toEqual([]);
  });

  it('rejects an embedder that returns the wrong dimension', async () => {
    const bad = {
      dim: 4,
      embed: async (texts: string[]) => texts.map(() => new Float32Array(3)),
    };
    const index = new SemanticIndex(bad);
    await expect(index.addMeeting('m', linesOf(['x']))).rejects.toThrow(/dim/);
  });
});
