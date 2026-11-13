import { joinVariants } from './variant-text';
import type { VocabularyEntry } from './types';

export function formatWordList(entries: readonly VocabularyEntry[]): string {
  return entries
    .map((e) => {
      const word = /[,;\t="]/.test(e.word) ? `"${e.word.replace(/"/g, '""')}"` : e.word;
      return e.variants.length > 0 ? `${word} = ${joinVariants(e.variants)}` : word;
    })
    .join('\n')
    .concat(entries.length > 0 ? '\n' : '');
}

function csvCell(text: string): string {
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatWordCsv(entries: readonly VocabularyEntry[]): string {
  const rows = entries.map((e) => `${csvCell(e.word)},${csvCell(joinVariants(e.variants))}`);
  return ['word,heard as', ...rows].join('\n') + '\n';
}
