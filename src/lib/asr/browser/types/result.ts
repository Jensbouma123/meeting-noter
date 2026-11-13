import type { BrowserLanguageInfo } from './language';
import type { BrowserSegment } from './segment';
import type { BrowserWord } from './word';

export interface BrowserTranscribeResult {
  segments: BrowserSegment[];
  language: BrowserLanguageInfo | null;
  error: string | null;
}

export interface BrowserRecognizeResult {
  text: string;
  words: BrowserWord[];
  error: string | null;
}
