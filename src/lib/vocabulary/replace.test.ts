import { describe, expect, it } from 'vitest';
import {
  applyVocabularyToSegment,
  applyVocabularyToText,
  applyVocabularyToWords,
  editDistance,
  prepareVocabulary,
  soundKey,
} from './replace';

const vocab = prepareVocabulary([
  { word: 'Framna', variants: ['from now ah', 'fram na'] },
  { word: 'Hezelaer', variants: [] },
  { word: 'kubectl', variants: ['cube cuddle'] },
]);
const fix = (text: string) => applyVocabularyToText(text, vocab);

describe('applyVocabularyToText', () => {
  it('replaces a multi-word heard-as spelling, keeping the punctuation around it', () => {
    expect(fix('We met (fram na), then left.')).toBe('We met (Framna), then left.');
    expect(fix('Talk to from now ah tomorrow')).toBe('Talk to Framna tomorrow');
  });

  it('fixes near-misses of the word itself (as the model really mishears them)', () => {
    expect(fix('Fromna is growing')).toBe('Framna is growing');
    expect(fix('I spoke with Hezelair and Hazeler and Hezelar.')).toBe(
      'I spoke with Hezelaer and Hezelaer and Hezelaer.',
    );
  });

  it('leaves ordinary words that only sound a bit alike', () => {
    const text = 'From now on the frame is ready, says the farmer. Hazel likes hazelnuts.';
    expect(fix(text)).toBe(text);
  });

  it('only matches whole words', () => {
    expect(fix('Framnas and preframna stay')).toBe('Framnas and preframna stay');
    expect(fix('fram nab')).toBe('fram nab');
  });

  it('does not join words across punctuation', () => {
    expect(fix('fram, na')).toBe('fram, na');
  });

  it("keeps the user's spelling of a name and the text's capitals for a lowercase term", () => {
    expect(fix('framna')).toBe('Framna');
    expect(fix('Cube cuddle works')).toBe('Kubectl works');
    expect(fix('use CUBE CUDDLE')).toBe('use KUBECTL');
    expect(fix('use cube cuddle')).toBe('use kubectl');
  });

  it('returns the same string when nothing matched', () => {
    const text = 'Nothing to see here.';
    expect(fix(text)).toBe(text);
    expect(applyVocabularyToText('fram na', prepareVocabulary([]))).toBe('fram na');
  });

  it('keeps the whitespace it does not touch', () => {
    expect(fix('  a  fram na\tb ')).toBe('  a  Framna\tb ');
  });
});

describe('applyVocabularyToWords / applyVocabularyToSegment', () => {
  const words = [
    { text: 'met', start: 0, end: 0.2 },
    { text: 'fram', start: 0.3, end: 0.5 },
    { text: 'na,', start: 0.5, end: 0.7 },
    { text: 'ok', start: 0.8, end: 1 },
  ];

  it('merges a matched span into one word spanning its times', () => {
    expect(applyVocabularyToWords(words, vocab)).toEqual([
      { text: 'met', start: 0, end: 0.2 },
      { text: 'Framna,', start: 0.3, end: 0.7 },
      { text: 'ok', start: 0.8, end: 1 },
    ]);
  });

  it('fixes text and words together, and returns the same object when nothing changes', () => {
    const seg = { text: 'met fram na, ok', words };
    const out = applyVocabularyToSegment(seg, vocab);
    expect(out.text).toBe('met Framna, ok');
    expect(out.words?.map((w) => w.text)).toEqual(['met', 'Framna,', 'ok']);
    const clean = { text: 'nothing', words: [{ text: 'nothing', start: 0, end: 1 }] };
    expect(applyVocabularyToSegment(clean, vocab)).toBe(clean);
    expect(applyVocabularyToSegment(seg, prepareVocabulary([]))).toBe(seg);
  });
});

describe('soundKey / editDistance', () => {
  it('give the same key to near-misses', () => {
    expect(soundKey('Framna')).toBe(soundKey('Fromna'));
    expect(soundKey('Hezelaer')).toBe(soundKey('Hezelair'));
    expect(soundKey('Hazel')).not.toBe(soundKey('Hezelaer'));
    // "frame" shares Framna's key; the edit limit is what keeps it (see "leaves ordinary words").
    expect(soundKey('frame')).toBe(soundKey('Framna'));
  });

  it('counts edits and stops past the limit', () => {
    expect(editDistance('fromna', 'framna')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('abcdef', 'uvwxyz', 1)).toBe(2);
  });
});
