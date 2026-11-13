import { addVocabularyEntries, getVocabulary } from './store';
import type { VocabularyEntry } from './types';

const DEFAULT_LABEL = /^(speaker|spreker|you|jij|jou|me)(\s+\d+)?$/i;

export function nameVocabularyWords(name: string): string[] {
  const full = name.trim().replace(/\s+/g, ' ');
  if (full.length < 2 || DEFAULT_LABEL.test(full)) return [];
  const words = [full];
  const parts = full.split(' ');
  if (parts.length > 1) for (const part of parts) if (part.length >= 3) words.push(part);
  return words;
}

export function addNameToVocabulary(name: string): number {
  const known = new Set(getVocabulary().entries.map((e) => e.word.toLowerCase()));
  const fresh: VocabularyEntry[] = [];
  for (const word of nameVocabularyWords(name)) {
    const key = word.toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    fresh.push({ word, variants: [], source: 'meeting' });
  }
  if (fresh.length > 0) addVocabularyEntries(fresh);
  return fresh.length;
}
