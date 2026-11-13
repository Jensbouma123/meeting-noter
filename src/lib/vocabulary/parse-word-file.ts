import { parseWordCsv } from './parse-word-csv';
import { parseWordList } from './parse-word-list';
import type { VocabularyEntry } from './types';

export function parseWordFile(fileName: string, text: string): VocabularyEntry[] {
  return /\.csv$/i.test(fileName) ? parseWordCsv(text) : parseWordList(text);
}
