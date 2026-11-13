import type { OverlapSpan, TimedWord } from './types/overlap-retranscribe';

export const SAME_WORD_SECONDS = 0.5;
export const SAME_PHRASE_SECONDS = 2;

function normalized(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

export function wordMidpoint(word: TimedWord): number {
  return (word.start + word.end) / 2;
}

function inSamePhrase(first: readonly TimedWord[], second: readonly TimedWord[], i: number): boolean {
  const text = normalized(second[i].text);
  const at = wordMidpoint(second[i]);
  return first.some((w, j) => {
    if (normalized(w.text) !== text || Math.abs(wordMidpoint(w) - at) > SAME_PHRASE_SECONDS) return false;
    const before = i > 0 && j > 0 && normalized(second[i - 1].text) === normalized(first[j - 1].text);
    const after = i + 1 < second.length && j + 1 < first.length &&
      normalized(second[i + 1].text) === normalized(first[j + 1].text);
    return before || after;
  });
}

export function missedWords<T extends TimedWord>(first: readonly TimedWord[], second: readonly T[], span: OverlapSpan): T[] {
  const used = new Set<number>();
  const missed: T[] = [];
  const ordered = [...first].sort((a, b) => a.start - b.start);
  for (const [i, word] of second.entries()) {
    const text = normalized(word.text);
    if (!text || inSamePhrase(ordered, second, i)) continue;
    const at = wordMidpoint(word);
    let match = -1;
    let gap = SAME_WORD_SECONDS;
    first.forEach((w, i) => {
      if (used.has(i) || normalized(w.text) !== text) return;
      const d = Math.abs(wordMidpoint(w) - at);
      if (d <= gap) {
        match = i;
        gap = d;
      }
    });
    if (match >= 0) used.add(match);
    else if (at >= span.start && at < span.end) missed.push(word);
  }
  return missed;
}
