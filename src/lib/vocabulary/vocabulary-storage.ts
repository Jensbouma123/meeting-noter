import { DEFAULT_BIAS_STRENGTH, MAX_BIAS_STRENGTH } from './constants';
import { mergeEntries } from './merge-entries';
import type { VocabularyEntry, VocabularyState } from './types';

export const VOCABULARY_STORAGE_KEY = 'mn.vocabulary';

export const EMPTY_VOCABULARY: VocabularyState = { entries: [], strength: DEFAULT_BIAS_STRENGTH };

export function clampStrength(value: unknown): number {
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

export function loadVocabulary(): VocabularyState {
  if (typeof window === 'undefined') return EMPTY_VOCABULARY;
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    if (!raw) return EMPTY_VOCABULARY;
    const parsed = JSON.parse(raw);
    return { entries: parseEntries(parsed.entries), strength: clampStrength(parsed.strength) };
  } catch {
    return EMPTY_VOCABULARY;
  }
}

export function persistVocabulary(state: VocabularyState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}
