import { describe, expect, it } from 'vitest';
import type { HypSegment } from '../types/hyp-segment';
import type { RefTurn } from '../types/ref-turn';
import { diarizationError } from './der';
import { intWords } from './number-words';
import { isOverSplit, overSplitRate, turnLines } from './oversplit';
import { corpusWer, editDistance, normalizeWords, speakerWer } from './wer';

const ref = (speaker: string, start: number, end: number, text?: string, extra: Partial<RefTurn> = {}): RefTurn => ({ speaker, start, end, text, ...extra });
const hyp = (label: string | null, start: number, end: number, text = 'some words here'): HypSegment => ({ label, start, end, text });

describe('normalizeWords', () => {
  it('lowercases, drops tags, punctuation and apostrophes, and spells numbers', () => {
    expect(normalizeWords("Hello, World! It's 42% [laughter]")).toEqual(['hello', 'world', 'its', 'forty', 'two', 'percent']);
    expect(normalizeWords('1,000 people, 3.5 hours.')).toEqual(['one', 'thousand', 'people', 'three', 'point', 'five', 'hours']);
    expect(intWords(2024)).toEqual(['two', 'thousand', 'twenty', 'four']);
    expect(intWords(1_300_005)).toEqual(['one', 'million', 'three', 'hundred', 'thousand', 'five']);
  });
});

describe('WER', () => {
  it('counts word substitutions, insertions and deletions', () => {
    expect(editDistance(['a', 'b', 'c'], ['a', 'x', 'c', 'd'])).toBe(2);
    expect(editDistance([], ['a'])).toBe(1);
    expect(editDistance(['a', 'b'], [])).toBe(2);
  });

  it('joins both sides in time order before comparing', () => {
    const turns = [ref('A', 5, 6, 'see you'), ref('B', 0, 2, 'Hello there.')];
    const segs = [hyp('x', 5, 6, 'see ya'), hyp('y', 0, 2, 'hello there')];
    expect(corpusWer(turns, segs)).toEqual({ refWords: 4, hypWords: 4, edits: 1, wer: 0.25 });
  });

  it('is null without reference text', () => {
    expect(corpusWer([ref('A', 0, 1)], [hyp('x', 0, 1)])).toBeNull();
  });

  it('scores each speaker against the lines mapped to them', () => {
    const turns = [ref('A', 0, 2, 'one two three four'), ref('B', 2, 4, 'five six')];
    const segs = [hyp('x', 0, 2, 'one two three four'), hyp('y', 2, 3, 'five'), hyp('z', 3, 4, 'six')];
    expect(speakerWer(turns, segs, { x: 'A', y: 'B' })).toEqual([
      { speaker: 'A', labels: ['x'], refWords: 4, hypWords: 4, edits: 0, wer: 0 },
      { speaker: 'B', labels: ['y'], refWords: 2, hypWords: 1, edits: 1, wer: 0.5 },
    ]);
  });
});

describe('diarizationError', () => {
  const two = [ref('A', 0, 2), ref('B', 2, 4)];
  const map = { x: 'A', y: 'B' };

  it('is zero for a perfect labelling', () => {
    expect(diarizationError(two, [hyp('x', 0, 2), hyp('y', 2, 4)], map, 0)).toMatchObject({ scoredSec: 4, der: 0 });
  });

  it('splits error into confusion and miss', () => {
    expect(diarizationError(two, [hyp('x', 0, 3)], map, 0)).toEqual({ scoredSec: 4, missSec: 1, falseAlarmSec: 0, confusionSec: 1, der: 0.5 });
  });

  it('counts an extra unmapped label as false alarm', () => {
    const d = diarizationError(two, [hyp('x', 0, 2), hyp('y', 2, 4), hyp('z', 1, 2)], map, 0);
    expect(d).toEqual({ scoredSec: 4, missSec: 0, falseAlarmSec: 1, confusionSec: 0, der: 0.25 });
  });

  it('scores overlapped speech per speaker', () => {
    const d = diarizationError([ref('A', 0, 2), ref('B', 1, 2)], [hyp('x', 0, 2)], map, 0);
    expect(d).toMatchObject({ scoredSec: 3, missSec: 1 });
    expect(d!.der).toBeCloseTo(1 / 3);
  });

  it('skips a collar around every reference boundary', () => {
    expect(diarizationError([ref('A', 0, 2)], [hyp('x', 0.2, 1.8)], map)).toMatchObject({ scoredSec: 1.5, der: 0 });
  });

  it('is null when nothing is labelled', () => {
    expect(diarizationError(two, [hyp(null, 0, 4)], map)).toBeNull();
  });
});

describe('over-split', () => {
  it('flags a short turn covered by more than two lines', () => {
    const turns = [ref('A', 0, 10), ref('B', 10, 12), ref('A', 12, 30), ref('B', 30, 30.5, undefined, { event: 'backchannel' })];
    const segs = [hyp('x', 0, 3), hyp('x', 3, 6), hyp('x', 6, 10.5), hyp('y', 10.4, 12), hyp('x', 12, 30), hyp('y', 30, 30.5)];
    const rows = turnLines(turns, segs);
    expect(rows).toEqual([{ event: 'turn', lines: 3 }, { event: 'turn', lines: 1 }]);
    expect(rows.map(isOverSplit)).toEqual([true, false]);
    expect(overSplitRate(rows)).toBe(0.5);
    expect(overSplitRate([])).toBeNull();
  });
});
