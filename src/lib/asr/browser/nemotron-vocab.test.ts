import { describe, expect, it } from 'vitest';
import { nemotronLangId } from './nemotron-constants';
import { parseNemotronVocab, tokensToWords } from './nemotron-vocab';
import { makeVocab } from './nemotron-test-fakes';

describe('tokensToWords', () => {
  const vocab = makeVocab({ 1: '<en-US>', 5: '▁Hel', 6: 'lo', 7: '▁world', 8: '.' });

  it('starts a word at every ▁ piece and times it by encoder frame', () => {
    const words = tokensToWords(
      [
        { id: 1, frame: 0, logProb: 0 },
        { id: 5, frame: 10, logProb: Math.log(0.5) },
        { id: 6, frame: 11, logProb: Math.log(1) },
        { id: 7, frame: 20, logProb: Math.log(0.9) },
        { id: 8, frame: 20, logProb: Math.log(0.9) },
      ],
      vocab,
    );
    expect(words.map((w) => w.text)).toEqual(['Hello', 'world.']);
    expect(words[0].start).toBeCloseTo(0.8);
    expect(words[0].end).toBeCloseTo(0.96);
    expect(words[0].confidence).toBeCloseTo(0.75);
    expect(words[1].start).toBeCloseTo(1.6);
    expect(words[1].end).toBeCloseTo(1.68);
  });

  it('shifts every time earlier by the lead, never below zero', () => {
    const words = tokensToWords([{ id: 7, frame: 2, logProb: 0 }], vocab, 0.5);
    expect(words[0].start).toBe(0);
    expect(words[0].end).toBeCloseTo(0);
  });
});

describe('vocab and language', () => {
  it('reads one piece per line, blank last', () => {
    expect(parseNemotronVocab('<unk>\n▁a\n<blank>\n')).toEqual(['<unk>', '▁a', '<blank>']);
  });

  it('maps languages to the prompt ids, auto for anything unlisted', () => {
    expect(nemotronLangId('en')).toBe(0);
    expect(nemotronLangId('nl')).toBe(16);
    expect(nemotronLangId('nl-BE')).toBe(16);
    expect(nemotronLangId('xx')).toBe(101);
    expect(nemotronLangId(undefined)).toBe(101);
  });
});
