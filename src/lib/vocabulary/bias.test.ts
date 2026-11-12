import { describe, expect, it } from 'vitest';
import { BiaserSlot, ContextBiaser, argmax, pieceText } from './bias';

// A toy SentencePiece vocabulary: id = index.
const VOCAB = ['<blk>', '▁from', '▁Fr', 'om', 'am', 'na', '▁now', '▁', 'Fram', '▁Framna', '▁to', 'pic', 'n', 'a'];
const id = (piece: string) => VOCAB.indexOf(piece);

function boosted(biaser: ContextBiaser): string[] {
  const bonus = biaser.currentBonus();
  return VOCAB.filter((_, i) => bonus[i] > 0);
}

describe('pieceText', () => {
  it('turns ▁ into a space and drops special pieces', () => {
    expect(pieceText('▁Fr')).toBe(' Fr');
    expect(pieceText('<blk>')).toBe('');
  });
});

describe('ContextBiaser trie', () => {
  it('walks every tokenisation of a word to the same node', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    const viaPieces = b.walk(b.walk(b.walk(0, ' Fr'), 'am'), 'na');
    const whole = b.walk(0, ' Framna');
    expect(whole).toBeGreaterThan(0);
    expect(viaPieces).toBe(whole);
    expect(b.walk(0, ' from')).toBe(-1);
  });

  it('is empty without words', () => {
    expect(new ContextBiaser(VOCAB, [], 3).isEmpty).toBe(true);
    expect(new ContextBiaser(VOCAB, ['  '], 3).isEmpty).toBe(true);
  });
});

describe('ContextBiaser boost', () => {
  it('boosts nothing before a word has started (no word-start bonus by default)', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    expect(boosted(b)).toEqual([]);
  });

  it('boosts word-start pieces with startShare, but never a bare ▁', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 2, 0.5);
    expect(boosted(b)).toEqual(['▁Fr', '▁Framna']);
    expect(b.currentBonus()[id('▁Fr')]).toBe(1);
  });

  it('boosts the pieces that continue a started match, by the full strength', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Fr'));
    expect(boosted(b)).toEqual(['am', 'a']);
    expect(b.currentBonus()[id('am')]).toBe(3);
    b.advance(id('am'));
    expect(boosted(b)).toEqual(['na', 'n']);
  });

  it('cancels the match when the emitted piece leaves the word', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Fr'));
    b.advance(id('om'));
    expect(boosted(b)).toEqual([]);
  });

  it('stops boosting once the word is complete', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Framna'));
    expect(boosted(b)).toEqual([]);
  });

  it('reset() drops a match in progress', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Fr'));
    b.reset();
    expect(boosted(b)).toEqual([]);
  });

  it('apply() flips a close argmax towards the word and leaves the input untouched', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Fr'));
    const logits = new Float32Array(VOCAB.length);
    logits[id('om')] = 5;
    logits[id('am')] = 3;
    const out = b.apply(logits);
    expect(argmax(out)).toBe(id('am'));
    expect(logits[id('am')]).toBe(3);
  });

  it('apply() returns the very same array when there are no words', () => {
    const logits = new Float32Array(VOCAB.length);
    expect(new ContextBiaser(VOCAB, [], 3).apply(logits)).toBe(logits);
  });

  it('a far-ahead competitor still wins (the bonus is bounded)', () => {
    const b = new ContextBiaser(VOCAB, ['Framna'], 3);
    b.advance(id('▁Fr'));
    const logits = new Float32Array(VOCAB.length);
    logits[id('om')] = 10;
    logits[id('am')] = 3;
    expect(argmax(b.apply(logits))).toBe(id('om'));
  });
});

describe('BiaserSlot', () => {
  it('has no biaser without words, vocab or strength', () => {
    const slot = new BiaserSlot();
    slot.setWords(['Framna'], 3);
    expect(slot.get()).toBeNull();
    slot.setVocab(VOCAB);
    expect(slot.get()).not.toBeNull();
    slot.setWords(['Framna'], 0);
    expect(slot.get()).toBeNull();
    slot.setWords([], 3);
    expect(slot.get()).toBeNull();
    slot.setWords(['Framna'], 3);
    slot.setVocab(null);
    expect(slot.get()).toBeNull();
  });
});
