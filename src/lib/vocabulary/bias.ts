import { DEFAULT_BIAS_STRENGTH, WORD_START_SHARE } from './constants';
import { pieceText } from './piece-text';
import type { Continuations, TrieNode } from './types';

const ROOT = 0;

export class ContextBiaser {
  private readonly nodes: TrieNode[] = [{ children: new Map(), terminal: false }];
  private readonly pieces: readonly string[];
  private readonly continuations = new Map<number, Continuations>();
  private readonly bonus: Float32Array;
    private readonly touched: number[] = [];
    private active: number[] = [];
  private bonusFor: string | null = null;
  readonly strength: number;
  private readonly startStrength: number;

    constructor(
    vocab: readonly string[],
    words: readonly string[],
    strength: number = DEFAULT_BIAS_STRENGTH,
    startShare: number = WORD_START_SHARE,
  ) {
    this.pieces = vocab.map(pieceText);
    this.bonus = new Float32Array(vocab.length);
    this.strength = strength;
    this.startStrength = strength * startShare;
    for (const word of words) this.insert(word);
  }

    get isEmpty(): boolean {
    return this.nodes[ROOT].children.size === 0;
  }

  private insert(word: string): void {
    const text = word.trim().replace(/\s+/g, ' ');
    if (!text) return;
    let node = ROOT;
    for (const ch of ` ${text}`) {
      let next = this.nodes[node].children.get(ch);
      if (next === undefined) {
        next = this.nodes.length;
        this.nodes.push({ children: new Map(), terminal: false });
        this.nodes[node].children.set(ch, next);
      }
      node = next;
    }
    this.nodes[node].terminal = true;
  }

    walk(node: number, text: string): number {
    for (const ch of text) {
      const next = this.nodes[node].children.get(ch);
      if (next === undefined) return -1;
      node = next;
    }
    return node;
  }

  private continuationsOf(node: number): Continuations {
    let found = this.continuations.get(node);
    if (!found) {
      const ids: number[] = [];
      const next: number[] = [];
      for (let id = 0; id < this.pieces.length; id++) {
        const text = this.pieces[id];
        if (!text || text.trim() === '') continue;
        const end = this.walk(node, text);
        if (end >= 0) {
          ids.push(id);
          next.push(end);
        }
      }
      found = { ids: Int32Array.from(ids), next: Int32Array.from(next) };
      this.continuations.set(node, found);
    }
    return found;
  }

    reset(): void {
    this.active = [];
    this.bonusFor = null;
  }

    currentBonus(): Float32Array {
    const key = this.active.join(',');
    if (this.bonusFor === key) return this.bonus;
    for (const id of this.touched) this.bonus[id] = 0;
    this.touched.length = 0;
    const starts = this.startStrength > 0 ? [ROOT] : [];
    for (const node of [...starts, ...this.active]) {
      const value = node === ROOT ? this.startStrength : this.strength;
      const { ids } = this.continuationsOf(node);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        if (this.bonus[id] === 0) this.touched.push(id);
        if (value > this.bonus[id]) this.bonus[id] = value;
      }
    }
    this.bonusFor = key;
    return this.bonus;
  }

    apply(logits: Float32Array): Float32Array {
    if (this.isEmpty) return logits;
    const bonus = this.currentBonus();
    const out = logits.slice();
    for (const id of this.touched) {
      if (id < out.length) out[id] += bonus[id];
    }
    return out;
  }

    advance(tokenId: number): void {
    const text = this.pieces[tokenId];
    const active: number[] = [];
    if (text) {
      for (const node of [ROOT, ...this.active]) {
        const end = this.walk(node, text);
        if (end > ROOT && this.nodes[end].children.size > 0 && !active.includes(end)) active.push(end);
      }
    }
    this.active = active;
  }
}
