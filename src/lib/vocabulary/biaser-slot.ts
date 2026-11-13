import { DEFAULT_BIAS_STRENGTH } from './constants';
import { ContextBiaser } from './bias';

export class BiaserSlot {
  private words: readonly string[] = [];
  private strength = DEFAULT_BIAS_STRENGTH;
  private vocab: readonly string[] | null = null;
  private biaser: ContextBiaser | null = null;

  setWords(words: readonly string[], strength: number): void {
    this.words = words;
    this.strength = strength;
    this.rebuild();
  }

  setVocab(vocab: readonly string[] | null): void {
    this.vocab = vocab;
    this.rebuild();
  }

  get(): ContextBiaser | null {
    return this.biaser;
  }

  private rebuild(): void {
    this.biaser = null;
    if (!this.vocab || this.words.length === 0 || !(this.strength > 0)) return;
    const biaser = new ContextBiaser(this.vocab, this.words, this.strength);
    if (!biaser.isEmpty) this.biaser = biaser;
  }
}
