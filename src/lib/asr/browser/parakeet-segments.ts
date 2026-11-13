import type { TranscribeResult } from 'parakeet.js';
import { BROWSER_ASR_LANGUAGE_NAMES } from './constants';
import type { BrowserLanguageInfo, BrowserSegment, BrowserWord, RecognizedWords } from './types';

let segmentCounter = 0;

export function nextSegmentId(): string {
  return `browser-${++segmentCounter}`;
}

export function resetSegmentIds(): void {
  segmentCounter = 0;
}

export function toBrowserWords(words: RecognizedWords): BrowserWord[] {
  return words.map((w) => ({
    text: w.text,
    start: w.start_time,
    end: w.end_time,
    ...(typeof w.confidence === 'number' ? { confidence: w.confidence } : {}),
  }));
}

export function buildLanguageInfo(language: string, locked: boolean): BrowserLanguageInfo {
  return {
    code: language,
    name: BROWSER_ASR_LANGUAGE_NAMES[language] ?? language,
    locked,
    confidence: locked ? 1.0 : 0.5,
  };
}

export function buildSegment(
  result: TranscribeResult,
  id: string,
  fullText: string,
  source: 'mic' | 'system',
  speakerLabel: string,
  isFinal: boolean,
): BrowserSegment {
  const nowSec = result.metrics ? result.metrics.total_ms / 1000 : 0;
  const seg: BrowserSegment = {
    id,
    source,
    speaker: speakerLabel,
    text: fullText,
    start: nowSec - fullText.length * 0.05,
    end: nowSec,
    final: isFinal,
  };
  if (result.words?.length) seg.words = toBrowserWords(result.words);
  return seg;
}
