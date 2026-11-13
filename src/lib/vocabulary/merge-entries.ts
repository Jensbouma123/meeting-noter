import { cleanText } from './clean-text';
import type { VocabularyEntry } from './types';

export function mergeEntries(
  existing: readonly VocabularyEntry[],
  incoming: readonly VocabularyEntry[],
): VocabularyEntry[] {
  const out = existing.map((e) => ({ ...e, variants: [...e.variants] }));
  for (const entry of incoming) {
    const word = cleanText(entry.word);
    if (!word) continue;
    let target = out.find((e) => e.word.toLowerCase() === word.toLowerCase());
    if (!target) {
      target = { word, variants: [], ...(entry.source ? { source: entry.source } : {}) };
      out.push(target);
    }
    for (const variant of entry.variants.map(cleanText)) {
      if (!variant || variant.toLowerCase() === target.word.toLowerCase()) continue;
      if (!target.variants.some((v) => v.toLowerCase() === variant.toLowerCase())) target.variants.push(variant);
    }
  }
  return out;
}
