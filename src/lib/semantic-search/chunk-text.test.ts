import { describe, expect, it } from 'vitest';
import { chunkTranscript } from './chunk';
import { createFakeEmbedder } from './fake-embedder';
import { tokenize } from './text';
import { EMBEDDING_DIM, type TranscriptLine } from './types';

function linesOf(texts: string[], seconds = 30): TranscriptLine[] {
  return texts.map((text, i) => ({ start: i * seconds, end: i * seconds + 10, text }));
}

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
