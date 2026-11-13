import { cleanText } from './clean-text';
import { mergeEntries } from './merge-entries';
import type { VocabularyEntry } from './types';
import { splitVariants } from './variant-text';

function readQuoted(line: string): { word: string; rest: string } | null {
  if (!line.startsWith('"')) return null;
  let word = '';
  for (let i = 1; i < line.length; i++) {
    if (line[i] !== '"') word += line[i];
    else if (line[i + 1] === '"') {
      word += '"';
      i++;
    } else return { word, rest: line.slice(i + 1).trim() };
  }
  return null;
}

function parseLine(line: string, entries: VocabularyEntry[]): void {
  const quoted = readQuoted(line);
  if (quoted) {
    const word = cleanText(quoted.word);
    const { rest } = quoted;
    if (rest.startsWith('=')) {
      if (word) entries.push({ word, variants: splitVariants(rest.slice(1)) });
      return;
    }
    if (word) entries.push({ word, variants: [] });
    if (/^[,;\t]/.test(rest)) parseLine(rest.slice(1).trim(), entries);
    return;
  }
  const eq = line.indexOf('=');
  if (eq > 0) {
    const word = cleanText(line.slice(0, eq));
    if (word) entries.push({ word, variants: splitVariants(line.slice(eq + 1)) });
    return;
  }
  const cut = line.search(/[,;\t]/);
  const head = cut < 0 ? line : line.slice(0, cut);
  const word = cleanText(head);
  if (word) entries.push({ word, variants: [] });
  if (cut >= 0) parseLine(line.slice(cut + 1).trim(), entries);
}

export function parseWordList(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) parseLine(line, entries);
  }
  return mergeEntries([], entries);
}
