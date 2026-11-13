import type { Segment, SegmentWord } from '@/lib/meeting/types';
import { findMatches } from './find-matches';
import { replacementText } from './replacement-text';
import { splitChunk } from './text-chunk';
import type { Prepared } from './types';

export function applyVocabularyToText(text: string, vocab: Prepared): string {
  if (vocab.entries.length === 0 || !text) return text;
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
    for (let p = first + 1; p <= last; p++) parts[p] = '';
  }
  return changed ? parts.join('') : text;
}

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

export function applyVocabularyToSegment<T extends Pick<Segment, 'text' | 'words'>>(seg: T, vocab: Prepared): T {
  if (vocab.entries.length === 0) return seg;
  const text = applyVocabularyToText(seg.text, vocab);
  const words = seg.words ? applyVocabularyToWords(seg.words, vocab) : seg.words;
  if (text === seg.text && words === seg.words) return seg;
  return { ...seg, text, ...(words ? { words: words as SegmentWord[] } : {}) };
}
