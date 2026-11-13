import { cleanText } from './clean-text';
import { mergeEntries } from './merge-entries';
import type { VocabularyEntry } from './types';
import { splitVariants } from './variant-text';

function csvCells(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',' || ch === ';' || ch === '\t') {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseWordCsv(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  lines.forEach((line, i) => {
    const [first, ...rest] = csvCells(line);
    const word = cleanText(first ?? '');
    if (!word || (i === 0 && word.toLowerCase() === 'word')) return;
    entries.push({ word, variants: rest.flatMap(splitVariants) });
  });
  return mergeEntries([], entries);
}
