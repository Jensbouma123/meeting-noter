/**
 * The word list as plain text: what the paste box accepts and what the
 * .txt/.csv import and export read and write.
 *
 * - Paste / .txt: one word per line, or several on a line separated by commas.
 *   A line `Framna = from now; fram na` also gives how it was misheard.
 * - .csv: `word,heard as` rows; the second column holds misheard spellings
 *   separated by `;`. A header row is skipped.
 */
import type { VocabularyEntry } from './types';

function clean(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function splitVariants(text: string): string[] {
  return text.split(/[;|]/).map(clean).filter(Boolean);
}

/** Merge `incoming` into `existing`: same word (any case) gains the new variants, new words append. */
export function mergeEntries(
  existing: readonly VocabularyEntry[],
  incoming: readonly VocabularyEntry[],
): VocabularyEntry[] {
  const out = existing.map((e) => ({ word: e.word, variants: [...e.variants] }));
  for (const entry of incoming) {
    const word = clean(entry.word);
    if (!word) continue;
    let target = out.find((e) => e.word.toLowerCase() === word.toLowerCase());
    if (!target) {
      target = { word, variants: [] };
      out.push(target);
    }
    for (const variant of entry.variants.map(clean)) {
      if (!variant || variant.toLowerCase() === target.word.toLowerCase()) continue;
      if (!target.variants.some((v) => v.toLowerCase() === variant.toLowerCase())) target.variants.push(variant);
    }
  }
  return out;
}

/** Words from the paste box or a .txt file. */
export function parseWordList(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const eq = line.indexOf('=');
    if (eq > 0) {
      const word = clean(line.slice(0, eq));
      if (word) entries.push({ word, variants: splitVariants(line.slice(eq + 1)) });
      continue;
    }
    for (const part of line.split(/[,;\t]/)) {
      const word = clean(part);
      if (word) entries.push({ word, variants: [] });
    }
  }
  return mergeEntries([], entries);
}

/** Split one CSV line into cells (double-quoted cells may contain commas and `""`). */
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

/** Words from a .csv file: first cell the word, the rest how it was misheard. */
export function parseWordCsv(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const [first, ...rest] = csvCells(line);
    const word = clean(first ?? '');
    if (!word || (i === 0 && word.toLowerCase() === 'word')) return;
    entries.push({ word, variants: rest.flatMap(splitVariants) });
  });
  return mergeEntries([], entries);
}

/** Words from an imported file, by its name. */
export function parseWordFile(fileName: string, text: string): VocabularyEntry[] {
  return /\.csv$/i.test(fileName) ? parseWordCsv(text) : parseWordList(text);
}

export function formatWordList(entries: readonly VocabularyEntry[]): string {
  return entries
    .map((e) => (e.variants.length > 0 ? `${e.word} = ${e.variants.join('; ')}` : e.word))
    .join('\n')
    .concat(entries.length > 0 ? '\n' : '');
}

function csvCell(text: string): string {
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatWordCsv(entries: readonly VocabularyEntry[]): string {
  const rows = entries.map((e) => `${csvCell(e.word)},${csvCell(e.variants.join('; '))}`);
  return ['word,heard as', ...rows].join('\n') + '\n';
}
