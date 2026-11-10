import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_DIM,
  SemanticIndex,
  chunkTranscript,
  createFakeEmbedder,
  findChapters,
  tokenize,
  type TranscriptLine,
} from './index';

/** One line per `seconds`, each ending well inside its own window. */
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

describe('chunkTranscript', () => {
  it('assigns each line to the window holding its midpoint', () => {
    const lines: TranscriptLine[] = [
      { start: 0, end: 20, text: 'first' },
      { start: 25, end: 40, text: 'straddles' },
      { start: 45, end: 50, text: 'second' },
    ];
    const windows = chunkTranscript('m1', lines, { windowSeconds: 30 });
    expect(windows.map((w) => w.text)).toEqual(['first', 'straddles second']);
    expect(windows.map((w) => w.index)).toEqual([0, 1]);
    expect(windows[0].meetingId).toBe('m1');
  });

  it('overlaps windows when the stride is shorter than the width', () => {
    const lines = linesOf(['a', 'b', 'c', 'd'], 10);
    const windows = chunkTranscript('m', lines, { windowSeconds: 20, strideSeconds: 10 });
    expect(windows.map((w) => w.text)).toEqual(['a b', 'b c', 'c d', 'd']);
  });

  it('skips blank lines and returns nothing for an empty transcript', () => {
    expect(chunkTranscript('m', [])).toEqual([]);
    expect(chunkTranscript('m', [{ start: 0, end: 1, text: '   ' }])).toEqual([]);
  });

  it('rejects a non-positive window', () => {
    expect(() => chunkTranscript('m', linesOf(['x']), { windowSeconds: 0 })).toThrow(RangeError);
  });
});

describe('tokenize', () => {
  it('drops English and Dutch function words and folds diacritics', () => {
    expect(tokenize('The budget, and de Coördinatie van het team!')).toEqual([
      'budget',
      'coordinatie',
      'team',
    ]);
  });

  it('keeps Dutch compounds whole', () => {
    expect(tokenize('vakantiehuis aan zee')).toEqual(['vakantiehuis', 'zee']);
  });
});

describe('createFakeEmbedder', () => {
  const embedder = createFakeEmbedder();

  it('returns 768-d vectors, unit length for non-empty text and zero for empty', async () => {
    const [a, b] = await embedder.embed(['budget forecast', '   ']);
    expect(a).toBeInstanceOf(Float32Array);
    expect(a.length).toBe(EMBEDDING_DIM);
    expect(Math.hypot(...a)).toBeCloseTo(1, 5);
    expect(Math.hypot(...b)).toBe(0);
  });

  it('is deterministic across instances', async () => {
    const [x] = await createFakeEmbedder().embed(['revenue forecast']);
    const [y] = await embedder.embed(['revenue forecast']);
    expect(Array.from(x)).toEqual(Array.from(y));
  });

  it('scores a Dutch compound closer to its part than to unrelated text', async () => {
    const [q, compound, other] = await embedder.embed([
      'strand',
      'strandhuis',
      'budget forecast',
    ]);
    const dot = (a: Float32Array, b: Float32Array) => a.reduce((s, x, i) => s + x * b[i], 0);
    expect(dot(q, compound)).toBeGreaterThan(dot(q, other));
  });
});

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

describe('findChapters', () => {
  it('cuts at the topic change and titles each chapter with its top terms', async () => {
    const embedder = createFakeEmbedder();
    const index = new SemanticIndex(embedder);
    await index.addMeeting('m', linesOf([...BUDGET, ...HOLIDAY]));

    const chapters = index.chapters('m', { minChapterWindows: 3 });
    expect(chapters).toHaveLength(2);
    // Lexical vectors are noisy at window level: the cut may land one window off.
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
