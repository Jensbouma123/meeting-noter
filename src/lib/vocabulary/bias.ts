/**
 * Decode-time contextual biasing for a greedy transducer decoder.
 *
 * The user's words go into a prefix trie of their characters, each word
 * prefixed with a space (SentencePiece's `▁`, i.e. "a new word starts here").
 * While decoding, a token whose text continues a match in progress gets
 * `strength` added to its logit before the argmax (a token that would only
 * start one gets `WORD_START_SHARE` of it). When the emitted token leaves
 * the trie the match is dropped.
 *
 * The trie is matched by each vocabulary piece's *text* rather than by one
 * fixed tokenisation of each word: the model may spell a name it has never
 * seen as `▁Fr am na` or `▁F ram na`, and every such split walks the same trie
 * path. Which pieces continue a given trie node is worked out once, the first
 * time the decoder reaches that node.
 */

/**
 * Added to a logit when nothing else is configured. Measured with
 * `scripts/vocab-bias-check.mjs`: 3 turned every Dutch "Fromna" into
 * "Framna" and changed nothing on the control clips or the AMI meeting;
 * 1.5 fixed one of four.
 */
export const DEFAULT_BIAS_STRENGTH = 3;
/**
 * Share of the bonus a piece gets for *starting* one of the words. Pieces
 * like `▁to` start "topic" and are common words in their own right; a full
 * bonus on them inserted words on the AMI meeting.
 */
export const WORD_START_SHARE = 0;
/** Highest strength the advanced setting allows. */
export const MAX_BIAS_STRENGTH = 5;

interface TrieNode {
  children: Map<string, number>;
  /** A word ends here. */
  terminal: boolean;
}

interface Continuations {
  /** Pieces whose whole text walks the trie from this node… */
  ids: Int32Array;
  /** …and the node each of them lands on. */
  next: Int32Array;
}

const ROOT = 0;

/** `<blk>`, `<unk>`, `<|en|>`, `<en-US>`: never text, never boosted. */
function isSpecialPiece(piece: string): boolean {
  return piece.length > 2 && piece.startsWith('<') && piece.endsWith('>');
}

/** A vocabulary piece as decoded text: `▁` is the space before a word. */
export function pieceText(piece: string | undefined): string {
  if (!piece || isSpecialPiece(piece)) return '';
  return piece.replace(/▁/g, ' ');
}

export class ContextBiaser {
  private readonly nodes: TrieNode[] = [{ children: new Map(), terminal: false }];
  private readonly pieces: readonly string[];
  private readonly continuations = new Map<number, Continuations>();
  private readonly bonus: Float32Array;
  /** Indexes set in `bonus` for the current state, so clearing is cheap. */
  private readonly touched: number[] = [];
  /** Trie nodes a match is in progress at (the root is always implied). */
  private active: number[] = [];
  private bonusFor: string | null = null;
  readonly strength: number;
  private readonly startStrength: number;

  /**
   * @param vocab  The model's pieces, index = token id (`▁` marks a word start).
   * @param words  The user's words and phrases, spelled as they should appear.
   * @param strength  Logit bonus per matching piece.
   * @param startShare  Share of `strength` a piece that *starts* a word gets.
   */
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

  /** Whether any word made it into the trie. */
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

  /** Walk `text` from `node`; the node it ends on, or -1 when it leaves the trie. */
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
        // A bare `▁` continues every match and would be boosted on every
        // step; it is followed (in `advance`) but never boosted.
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

  /** Forget any match in progress: a new, independent decode starts. */
  reset(): void {
    this.active = [];
    this.bonusFor = null;
  }

  /**
   * The bonus per token id for the current state (zero where none applies).
   * Valid until the next `advance()`/`reset()`; do not mutate.
   */
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

  /**
   * `logits` with the bonus added, as a copy (the input is the runtime's
   * output buffer). Returns the input unchanged when no word is configured.
   */
  apply(logits: Float32Array): Float32Array {
    if (this.isEmpty) return logits;
    const bonus = this.currentBonus();
    const out = logits.slice();
    for (const id of this.touched) {
      if (id < out.length) out[id] += bonus[id];
    }
    return out;
  }

  /** The decoder emitted `tokenId` (never call this for blank). */
  advance(tokenId: number): void {
    const text = this.pieces[tokenId];
    const active: number[] = [];
    if (text) {
      for (const node of [ROOT, ...this.active]) {
        const end = this.walk(node, text);
        // A finished word with nothing longer behind it has nothing left to boost.
        if (end > ROOT && this.nodes[end].children.size > 0 && !active.includes(end)) active.push(end);
      }
    }
    this.active = active;
  }
}

/** First index of the largest value — the same tie-break as the decoders' argmax loops. */
export function argmax(values: Float32Array): number {
  let best = 0;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max) {
      max = values[i];
      best = i;
    }
  }
  return best;
}

/**
 * An engine's current biaser: rebuilt when the word list or the model's
 * vocabulary changes, `null` whenever there is nothing to favour — the
 * decoders then take their unbiased path.
 */
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
