/** One word or phrase the speech model should spell the user's way. */
export interface VocabularyEntry {
  /** As it should appear in the transcript ("Framna"). */
  word: string;
  /** How the model has misheard it ("from now"); replaced by `word` afterwards. */
  variants: string[];
  /** Set when the word was added by the app from a meeting (a speaker's name), not typed by the user. */
  source?: 'meeting';
}

/** What the speech engine needs to favour the user's words while decoding. */
export interface VocabularyBiasConfig {
  /** Words and phrases, spelled as they should appear. Empty = no biasing. */
  words: string[];
  /** Logit bonus per matching piece (see `bias.ts`). */
  strength: number;
}
