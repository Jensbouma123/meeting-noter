export interface VocabularyEntry {
  word: string;
  variants: string[];
  source?: 'meeting';
}

export interface VocabularyBiasConfig {
  words: string[];
  strength: number;
}

export interface TrieNode {
  children: Map<string, number>;
  terminal: boolean;
}

export interface Continuations {
  ids: Int32Array;
  next: Int32Array;
}

export interface VocabularyState {
  entries: VocabularyEntry[];
  strength: number;
}

export type VocabularyEditResult = 'ok' | 'empty' | 'duplicate';

export interface Chunk {
  lead: string;
  core: string;
  trail: string;
}

export interface PreparedEntry {
  word: string;
  spellings: string[][];
  size: number;
  letters: string;
  key: string;
  maxEdits: number;
  edge: { lead: string; trail: string };
}

export interface Prepared {
  entries: PreparedEntry[];
  longest: number;
}

export interface Match {
  from: number;
  to: number;
  word: string;
}
