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

describe('replace edge cases', () => {
  it('keeps a word-final period that the user typed once, not twice', () => {
    const v = prepareVocabulary([{ word: 'Acme Inc.', variants: ['acme ink'] }]);
    expect(applyVocabularyToText('we are Acme Inc. today', v)).toBe('we are Acme Inc. today');
  });

  it('keeps the period of an entry like "Dr." when a speaker name adds it as a word', () => {
    const v = prepareVocabulary([{ word: 'Dr.', variants: [] }]);
    expect(applyVocabularyToText('Dr. Smith said so', v)).toBe('Dr. Smith said so');
  });

  it('does not rewrite a standalone letter because an entry carries a symbol ("C#")', () => {
    const v = prepareVocabulary([{ word: 'C#', variants: [] }]);
    expect(applyVocabularyToText('take vitamin C daily', v)).toBe('take vitamin C daily');
  });

  it('matches a word inside curly quotes and keeps the quotes', () => {
    expect(fix('said “fram na” twice')).toBe('said “Framna” twice');
  });

  it('matches and keeps a possessive', () => {
    expect(fix("fram na's plan")).toBe("Framna's plan");
  });

  it('matches unicode words in any case and keeps the user spelling', () => {
    const v = prepareVocabulary([{ word: 'Zoë', variants: ['zoe ik'] }]);
    expect(applyVocabularyToText('met zoe ik', v)).toBe('met Zoë');
    expect(applyVocabularyToText('met ZOË', v)).toBe('met Zoë');
  });

  it('a multi-word near-miss must have the same number of words', () => {
    const v = prepareVocabulary([{ word: 'Acme Cloud', variants: [] }]);
    expect(applyVocabularyToText('Acme Clowd', v)).toBe('Acme Cloud');
    expect(applyVocabularyToText('Acmeclowd', v)).toBe('Acmeclowd');
  });

  it('prefers the longest heard-as spelling when two entries start at the same word', () => {
    const v = prepareVocabulary([
      { word: 'Framna', variants: ['from now'] },
      { word: 'Now', variants: ['now ok'] },
    ]);
    expect(applyVocabularyToText('from now ok', v)).toBe('Framna ok');
  });

  it('a long transcript keeps every match and leaves the rest alone', () => {
    const words = Array.from({ length: 5000 }, (_, i) => (i % 500 === 0 ? 'from now ah' : `word${i}`));
    const out = applyVocabularyToText(words.join(' '), vocab).split(' ');
    expect(out.filter((w) => w === 'Framna')).toHaveLength(10);
    expect(out.filter((w) => w === 'from')).toHaveLength(0);
    expect(out[1]).toBe('word1');
  });

  it('applies the list to a segment whose words are missing (no words array)', () => {
    const out = applyVocabularyToSegment({ text: 'fram na' }, vocab);
    expect(out).toEqual({ text: 'Framna' });
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

  it('keeps a possessive on a near-miss and does not strip "\'s" from other words', () => {
    expect(fix("Fromna's plan")).toBe("Framna's plan");
    expect(fix("it's fine")).toBe("it's fine");
  });

  it('an entry with edge punctuation only matches text that carries it', () => {
    const v = prepareVocabulary([{ word: 'Dr.', variants: [] }]);
    expect(applyVocabularyToText('dr. who', v)).toBe('Dr. who');
    expect(applyVocabularyToText('the dr who', v)).toBe('the dr who');
  });
});
