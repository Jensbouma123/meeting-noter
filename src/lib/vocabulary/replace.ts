/**
 * After-the-fact fix-up of a transcript with the user's word list.
 *
 * Two kinds of match, both on whole words only:
 * - **Heard-as spellings** the user gave (or that "Fix this word" saved):
 *   "from now" → "Framna". Any number of words, compared case-insensitively.
 * - **Near-misses** of the word itself: same sound key and at most a small
 *   number of letter edits ("Fremna" → "Framna"). Deliberately strict — a
 *   word of four letters or fewer is never fuzzy-matched, and the span must
 *   have as many words as the entry — so ordinary words are left alone.
 *
 * Punctuation around a match is kept ("from now," → "Framna,"), and so is
 * the match's capitalisation when the user's word has none of its own
 * ("Kubectl" at a sentence start stays capitalised; a name keeps the user's
 * spelling).
 */
import type { Segment, SegmentWord } from '@/lib/meeting/types';
import type { VocabularyEntry } from './types';

/** One whitespace-separated piece: punctuation, the word itself, punctuation. */
interface Chunk {
  lead: string;
  core: string;
  trail: string;
}

interface PreparedEntry {
  word: string;
  /** Lower-cased word cores of each spelling to look for, the word itself first. */
  spellings: string[][];
  /** Word count of the entry, for near-miss spans. */
  size: number;
  /** Letters only, lower-cased, for near-miss matching. */
  letters: string;
  key: string;
  maxEdits: number;
}

export interface Prepared {
  entries: PreparedEntry[];
  /** Longest span, in words, any spelling covers. */
  longest: number;
}

const CHUNK = /^([^\p{L}\p{N}]*)([^]*?)([^\p{L}\p{N}]*)$/u;

function splitChunk(text: string): Chunk {
  const m = CHUNK.exec(text);
  return m ? { lead: m[1], core: m[2], trail: m[3] } : { lead: '', core: text, trail: '' };
}

function wordCores(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => splitChunk(w).core.toLowerCase())
    .filter(Boolean);
}

function lettersOf(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

const SOUND_CODES: Record<string, string> = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
};

/**
 * A Soundex-style sound key, untruncated: first letter, then the consonant
 * classes with vowels dropped and repeats collapsed. "Framna" and "Fremna"
 * share one; "frame" does too, which is why the edit limit also applies.
 */
export function soundKey(text: string): string {
  const letters = lettersOf(text).normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!letters) return '';
  let key = letters[0];
  let last = SOUND_CODES[letters[0]] ?? '';
  for (const ch of letters.slice(1)) {
    const code = SOUND_CODES[ch];
    if (code === undefined) {
      // h and w do not separate two equal codes; vowels do.
      if (ch !== 'h' && ch !== 'w') last = '';
      continue;
    }
    if (code !== last) key += code;
    last = code;
  }
  return key;
}

/** Levenshtein distance, stopping early once it exceeds `limit`. */
export function editDistance(a: string, b: string, limit = Infinity): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

/** How many letter edits a near-miss of a word this long may have. */
function allowedEdits(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 11) return 2;
  return 3;
}

export function prepareVocabulary(entries: readonly VocabularyEntry[]): Prepared {
  const prepared: PreparedEntry[] = [];
  let longest = 0;
  for (const entry of entries) {
    const word = entry.word.trim().replace(/\s+/g, ' ');
    const own = wordCores(word);
    if (own.length === 0) continue;
    const spellings = [own];
    for (const variant of entry.variants ?? []) {
      const cores = wordCores(variant);
      if (cores.length > 0) spellings.push(cores);
    }
    for (const s of spellings) longest = Math.max(longest, s.length);
    const letters = lettersOf(word);
    prepared.push({
      word,
      spellings,
      size: own.length,
      letters,
      key: soundKey(word),
      maxEdits: allowedEdits(letters.length),
    });
  }
  return { entries: prepared, longest };
}

/** The user's spelling, capitalised like the text it replaces when it has no capitals of its own. */
function withCase(replacement: string, original: string): string {
  if (replacement !== replacement.toLowerCase()) return replacement;
  const letters = original.replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase()) return replacement.toUpperCase();
  if (letters && letters[0] === letters[0].toUpperCase() && letters[0] !== letters[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

interface Match {
  /** Chunks covered, `[from, to)`. */
  from: number;
  to: number;
  word: string;
}

/** Whether chunks `[from, to)` can be one span: no punctuation inside it. */
function joinable(chunks: readonly Chunk[], from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (!chunks[i].core) return false;
    if (i > from && chunks[i].lead) return false;
    if (i < to - 1 && chunks[i].trail) return false;
  }
  return true;
}

function sameWords(chunks: readonly Chunk[], from: number, spelling: readonly string[]): boolean {
  for (let k = 0; k < spelling.length; k++) {
    if (chunks[from + k].core.toLowerCase() !== spelling[k]) return false;
  }
  return true;
}

function matchAt(chunks: readonly Chunk[], from: number, vocab: Prepared): Match | null {
  // Spellings first, longest first, so "from now" beats a one-word near-miss.
  let best: Match | null = null;
  for (const entry of vocab.entries) {
    for (const spelling of entry.spellings) {
      const to = from + spelling.length;
      if (to > chunks.length || (best && to <= best.to)) continue;
      if (joinable(chunks, from, to) && sameWords(chunks, from, spelling)) best = { from, to, word: entry.word };
    }
  }
  if (best) return best;
  for (const entry of vocab.entries) {
    if (entry.maxEdits === 0) continue;
    const to = from + entry.size;
    if (to > chunks.length || !joinable(chunks, from, to)) continue;
    const heard = lettersOf(chunks.slice(from, to).map((c) => c.core).join(''));
    if (heard.length < 4 || soundKey(heard) !== entry.key) continue;
    if (editDistance(heard, entry.letters, entry.maxEdits) <= entry.maxEdits) return { from, to, word: entry.word };
  }
  return null;
}

/** Every match in `chunks`, left to right, never overlapping. */
function findMatches(chunks: readonly Chunk[], vocab: Prepared): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < chunks.length; ) {
    const m = chunks[i].core ? matchAt(chunks, i, vocab) : null;
    if (m) {
      matches.push(m);
      i = m.to;
    } else {
      i += 1;
    }
  }
  return matches;
}

function replacementText(chunks: readonly Chunk[], m: Match): string {
  const original = chunks
    .slice(m.from, m.to)
    .map((c) => c.core)
    .join(' ');
  return chunks[m.from].lead + withCase(m.word, original) + chunks[m.to - 1].trail;
}

/** `text` with the word list applied; the same string when nothing matched. */
export function applyVocabularyToText(text: string, vocab: Prepared): string {
  if (vocab.entries.length === 0 || !text) return text;
  // Words and the whitespace between them, alternating (a leading space gives an empty first word).
  const parts = text.split(/(\s+)/);
  const wordIdx: number[] = [];
  for (let i = 0; i < parts.length; i += 2) if (parts[i]) wordIdx.push(i);
  const chunks = wordIdx.map((i) => splitChunk(parts[i]));
  const matches = findMatches(chunks, vocab);
  if (matches.length === 0) return text;
  let changed = false;
  for (const m of matches) {
    const replaced = replacementText(chunks, m);
    const first = wordIdx[m.from];
    const last = wordIdx[m.to - 1];
    if (first === last && parts[first] === replaced) continue;
    changed = true;
    parts[first] = replaced;
    // Drop the covered words and the whitespace between them.
    for (let p = first + 1; p <= last; p++) parts[p] = '';
  }
  return changed ? parts.join('') : text;
}

/** `words` with the word list applied, a merged span keeping its first start and last end. */
export function applyVocabularyToWords(words: readonly SegmentWord[], vocab: Prepared): readonly SegmentWord[] {
  if (vocab.entries.length === 0 || words.length === 0) return words;
  const chunks = words.map((w) => splitChunk(w.text.trim()));
  const matches = findMatches(chunks, vocab);
  if (matches.length === 0) return words;
  const out: SegmentWord[] = [];
  let next = 0;
  let changed = false;
  for (const m of matches) {
    out.push(...words.slice(next, m.from));
    const text = replacementText(chunks, m);
    const first = words[m.from];
    if (m.to - m.from === 1 && first.text.trim() === text) {
      out.push(first);
    } else {
      changed = true;
      out.push({ ...first, text, end: words[m.to - 1].end });
    }
    next = m.to;
  }
  out.push(...words.slice(next));
  return changed ? out : words;
}

/** `seg` with the word list applied to its text and words; the same object when nothing changed. */
export function applyVocabularyToSegment<T extends Pick<Segment, 'text' | 'words'>>(seg: T, vocab: Prepared): T {
  if (vocab.entries.length === 0) return seg;
  const text = applyVocabularyToText(seg.text, vocab);
  const words = seg.words ? applyVocabularyToWords(seg.words, vocab) : seg.words;
  if (text === seg.text && words === seg.words) return seg;
  return { ...seg, text, ...(words ? { words: words as SegmentWord[] } : {}) };
}
