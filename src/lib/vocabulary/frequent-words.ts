import { lettersOf } from './text-chunk';
import dutch from './frequent-words-nl.json';
import english from './frequent-words-en.json';

const FREQUENT = new Set<string>([...dutch.words, ...english.words]);

export function isFrequentWord(heard: string): boolean {
  return FREQUENT.has(lettersOf(heard));
}
