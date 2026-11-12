/**
 * The word list as plain text: what the paste box accepts and what the
 * .txt/.csv import and export read and write.
 *
 * - Paste / .txt: one word per line, or several on a line separated by commas.
 *   A line `Framna = from now; fram na` also gives how it was misheard.
 * - .csv: `word,heard as` rows; the second column holds misheard spellings
 *   separated by `;`. A header row is skipped.
 * - A misheard spelling that itself contains `;`, `|` or `\` is written with a
 *   backslash in front (`\;`, `\|`, `\\`). Other backslashes are kept as they are.
 */
import type { VocabularyEntry } from './types';

function clean(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** Split on unescaped `;` or `|`, and unescape `\;`, `\|`, `\\`. */
function splitVariants(text: string): string[] {
  const variants: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\' && /[\\;|]/.test(text[i + 1] ?? '')) {
      current += text[i + 1];
      i++;
    } else if (ch === ';' || ch === '|') {
      variants.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  variants.push(current);
  return variants.map(clean).filter(Boolean);
}

function joinVariants(variants: readonly string[]): string {
  return variants.map((v) => v.replace(/[\\;|]/g, (c) => `\\${c}`)).join('; ');
}

/** Merge `incoming` into `existing`: same word (any case) gains the new variants, new words append. */
export function mergeEntries(
  existing: readonly VocabularyEntry[],
  incoming: readonly VocabularyEntry[],
): VocabularyEntry[] {
  const out = existing.map((e) => ({ ...e, variants: [...e.variants] }));
  for (const entry of incoming) {
    const word = clean(entry.word);
    if (!word) continue;
    let target = out.find((e) => e.word.toLowerCase() === word.toLowerCase());
    if (!target) {
      target = { word, variants: [], ...(entry.source ? { source: entry.source } : {}) };
      out.push(target);
    }
    for (const variant of entry.variants.map(clean)) {
      if (!variant || variant.toLowerCase() === target.word.toLowerCase()) continue;
      if (!target.variants.some((v) => v.toLowerCase() === variant.toLowerCase())) target.variants.push(variant);
    }
  }
  return out;
}

/** A leading `"quoted"` word (`""` is a quote) and what follows it, or null. */
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
    const word = clean(quoted.word);
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
    const word = clean(line.slice(0, eq));
    if (word) entries.push({ word, variants: splitVariants(line.slice(eq + 1)) });
    return;
  }
  const cut = line.search(/[,;\t]/);
  const head = cut < 0 ? line : line.slice(0, cut);
  const word = clean(head);
  if (word) entries.push({ word, variants: [] });
  if (cut >= 0) parseLine(line.slice(cut + 1).trim(), entries);
}

/** Words from the paste box or a .txt file. */
export function parseWordList(text: string): VocabularyEntry[] {
  const entries: VocabularyEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line) parseLine(line, entries);
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
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  lines.forEach((line, i) => {
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
