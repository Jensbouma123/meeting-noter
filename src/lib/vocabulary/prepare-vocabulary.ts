import { lettersOf, splitChunk, wordCores } from './text-chunk';
import { soundKey } from './sound-key';
import type { Prepared, PreparedEntry, VocabularyEntry } from './types';

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
      edge: { lead: splitChunk(word.split(' ')[0]).lead, trail: splitChunk(word.split(' ').pop() ?? '').trail },
    });
  }
  return { entries: prepared, longest };
}
