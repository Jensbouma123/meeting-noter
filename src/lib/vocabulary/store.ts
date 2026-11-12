/**
 * The user's word list, kept in `localStorage` beside the other settings
 * (`mn.settings`), in its own key so a transcript can add to it ("Fix this
 * word") without going through the settings dialog's state.
 */
import { useSyncExternalStore } from 'react';
import { DEFAULT_BIAS_STRENGTH, MAX_BIAS_STRENGTH } from './bias';
import { prepareVocabulary, type Prepared } from './replace';
import { mergeEntries } from './text-format';
import type { VocabularyBiasConfig, VocabularyEntry } from './types';

export const VOCABULARY_STORAGE_KEY = 'mn.vocabulary';

export interface VocabularyState {
  entries: VocabularyEntry[];
  /** How strongly the speech model favours the list (advanced setting). */
  strength: number;
}

const EMPTY: VocabularyState = { entries: [], strength: DEFAULT_BIAS_STRENGTH };

let current: VocabularyState | null = null;
let prepared: { for: VocabularyState; value: Prepared } | null = null;
const listeners = new Set<() => void>();

function clampStrength(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_BIAS_STRENGTH;
  return Math.min(MAX_BIAS_STRENGTH, Math.max(0, n));
}

function parseEntries(value: unknown): VocabularyEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: VocabularyEntry[] = [];
  for (const item of value) {
    if (!item || typeof item.word !== 'string') continue;
    const variants = Array.isArray(item.variants) ? item.variants.filter((v: unknown) => typeof v === 'string') : [];
    entries.push({ word: item.word, variants, ...(item.source === 'meeting' ? { source: 'meeting' as const } : {}) });
  }
  return mergeEntries([], entries);
}

function load(): VocabularyState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { entries: parseEntries(parsed.entries), strength: clampStrength(parsed.strength) };
  } catch {
    return EMPTY;
  }
}

export function getVocabulary(): VocabularyState {
  current ??= load();
  return current;
}

function save(next: VocabularyState): void {
  current = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore localStorage write failures — the list lives for this page only.
    }
  }
  for (const fn of listeners) fn();
}

export function subscribeVocabulary(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useVocabulary(): VocabularyState {
  return useSyncExternalStore(subscribeVocabulary, getVocabulary, () => EMPTY);
}

export function setVocabularyEntries(entries: VocabularyEntry[]): void {
  save({ ...getVocabulary(), entries: mergeEntries([], entries) });
}

/** Add words (and how they were misheard) to the list, merging with what is there. */
export function addVocabularyEntries(entries: readonly VocabularyEntry[]): void {
  save({ ...getVocabulary(), entries: mergeEntries(getVocabulary().entries, entries) });
}

/**
 * "Fix this word": save `word` with what the transcript showed (`heard`) as
 * how it gets misheard. Returns false when there is nothing to save.
 */
export function addFixedWord(heard: string, word: string): boolean {
  const correct = word.trim().replace(/\s+/g, ' ');
  if (!correct) return false;
  const misheard = heard.trim().replace(/\s+/g, ' ');
  addVocabularyEntries([{ word: correct, variants: misheard && misheard !== correct ? [misheard] : [] }]);
  return true;
}

export type VocabularyEditResult = 'ok' | 'empty' | 'duplicate';

/** Rename a word in place. Refuses empty text or another entry's spelling (any case); a case-only change is fine. */
export function renameVocabularyEntry(word: string, next: string): VocabularyEditResult {
  const text = next.trim().replace(/\s+/g, ' ');
  if (!text) return 'empty';
  const { entries } = getVocabulary();
  if (entries.some((e) => e.word !== word && e.word.toLowerCase() === text.toLowerCase())) return 'duplicate';
  save({
    ...getVocabulary(),
    entries: entries.map((e) =>
      e.word === word ? { ...e, word: text, variants: e.variants.filter((v) => v.toLowerCase() !== text.toLowerCase()) } : e,
    ),
  });
  return 'ok';
}

/** Add a misheard version to a word. Refuses empty text, the word itself, or one it already has. */
export function addVocabularyVariant(word: string, variant: string): VocabularyEditResult {
  const text = variant.trim().replace(/\s+/g, ' ');
  if (!text) return 'empty';
  const entry = getVocabulary().entries.find((e) => e.word === word);
  if (!entry) return 'empty';
  if (text.toLowerCase() === word.toLowerCase() || entry.variants.some((v) => v.toLowerCase() === text.toLowerCase())) {
    return 'duplicate';
  }
  save({
    ...getVocabulary(),
    entries: getVocabulary().entries.map((e) => (e.word === word ? { ...e, variants: [...e.variants, text] } : e)),
  });
  return 'ok';
}

export function removeVocabularyVariant(word: string, variant: string): void {
  save({
    ...getVocabulary(),
    entries: getVocabulary().entries.map((e) =>
      e.word === word ? { ...e, variants: e.variants.filter((v) => v !== variant) } : e,
    ),
  });
}

export function removeVocabularyEntry(word: string): void {
  const state = getVocabulary();
  save({ ...state, entries: state.entries.filter((e) => e.word !== word) });
}

export function setVocabularyStrength(strength: number): void {
  save({ ...getVocabulary(), strength: clampStrength(strength) });
}

/** The list ready for `applyVocabularyTo*`, rebuilt only when it changes. */
export function getPreparedVocabulary(): Prepared {
  const state = getVocabulary();
  if (prepared?.for !== state) prepared = { for: state, value: prepareVocabulary(state.entries) };
  return prepared.value;
}

/** What the speech engine needs; no words (= no biasing) when the list is empty or switched off. */
export function getVocabularyBiasConfig(): VocabularyBiasConfig {
  const { entries, strength } = getVocabulary();
  return { words: strength > 0 ? entries.map((e) => e.word) : [], strength };
}

/** Test hook: forget the cached list so the next read comes from storage. */
export function resetVocabularyForTests(): void {
  current = null;
  prepared = null;
  listeners.clear();
}
