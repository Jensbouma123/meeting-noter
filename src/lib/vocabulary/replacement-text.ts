import type { Chunk, Match } from './types';

function withCase(replacement: string, original: string): string {
  if (replacement !== replacement.toLowerCase()) return replacement;
  const letters = original.replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase()) return replacement.toUpperCase();
  if (letters && letters[0] === letters[0].toUpperCase() && letters[0] !== letters[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function replacementText(chunks: readonly Chunk[], m: Match): string {
  const original = chunks
    .slice(m.from, m.to)
    .map((c) => c.core)
    .join(' ');
  const word = withCase(m.word, original);
  const lead = chunks[m.from].lead;
  const end = chunks[m.to - 1].trail;
  return (lead && word.startsWith(lead) ? '' : lead) + word + (end && word.endsWith(end) ? '' : end);
}
