import { useSyncExternalStore } from 'react';
import { mergeEntries } from './merge-entries';
import { prepareVocabulary } from './prepare-vocabulary';
import type { Prepared, VocabularyBiasConfig, VocabularyEditResult, VocabularyEntry, VocabularyState } from './types';
import { clampStrength, EMPTY_VOCABULARY, loadVocabulary, persistVocabulary } from './vocabulary-storage';

let current: VocabularyState | null = null;
let prepared: { for: VocabularyState; value: Prepared } | null = null;
const listeners = new Set<() => void>();

export function getVocabulary(): VocabularyState {
  current ??= loadVocabulary();
  return current;
}

function save(next: VocabularyState): void {
  current = next;
  persistVocabulary(next);
  for (const fn of listeners) fn();
}

export function subscribeVocabulary(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useVocabulary(): VocabularyState {
  return useSyncExternalStore(subscribeVocabulary, getVocabulary, () => EMPTY_VOCABULARY);
}

export function setVocabularyEntries(entries: VocabularyEntry[]): void {
  save({ ...getVocabulary(), entries: mergeEntries([], entries) });
}

export function addVocabularyEntries(entries: readonly VocabularyEntry[]): void {
  save({ ...getVocabulary(), entries: mergeEntries(getVocabulary().entries, entries) });
}

export function addFixedWord(heard: string, word: string): boolean {
  const correct = word.trim().replace(/\s+/g, ' ');
  if (!correct) return false;
  const misheard = heard.trim().replace(/\s+/g, ' ');
  addVocabularyEntries([{ word: correct, variants: misheard && misheard !== correct ? [misheard] : [] }]);
  return true;
}

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

export function getPreparedVocabulary(): Prepared {
  const state = getVocabulary();
  if (prepared?.for !== state) prepared = { for: state, value: prepareVocabulary(state.entries) };
  return prepared.value;
}

export function getVocabularyBiasConfig(): VocabularyBiasConfig {
  const { entries, strength } = getVocabulary();
  return { words: strength > 0 ? entries.map((e) => e.word) : [], strength };
}

export function resetVocabularyForTests(): void {
  current = null;
  prepared = null;
  listeners.clear();
}
