/**
 * Names the user gives people (a renamed speaker, their own name) join the
 * word list on their own, marked `source: 'meeting'`, so later transcripts
 * spell them right. Existing entries are never changed or removed.
 */
import { addVocabularyEntries, getVocabulary } from './store';
import type { VocabularyEntry } from './types';

/** "Speaker 2", "Spreker 3", "You" / "Jij" style labels the app hands out itself. */
const DEFAULT_LABEL = /^(speaker|spreker|you|jij|jou|me)(\s+\d+)?$/i;

/** The words worth adding for one name: the full name plus each part of 3+ letters. */
export function nameVocabularyWords(name: string): string[] {
  const full = name.trim().replace(/\s+/g, ' ');
  if (full.length < 2 || DEFAULT_LABEL.test(full)) return [];
  const words = [full];
  const parts = full.split(' ');
  if (parts.length > 1) for (const part of parts) if (part.length >= 3) words.push(part);
  return words;
}

/** Add `name` (and its parts) to the word list. Returns how many words were new. */
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
