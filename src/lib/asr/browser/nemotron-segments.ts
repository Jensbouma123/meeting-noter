import { NEMOTRON } from './nemotron-constants';
import type { BrowserLanguageInfo, BrowserRecognizeResult, BrowserSegment } from './types';

let segmentCounter = 0;

export function nextNemotronSegmentId(): string {
  return `browser-nemotron-${++segmentCounter}`;
}

export function resetNemotronSegmentIds(): void {
  segmentCounter = 0;
}

export function buildNemotronSegment(
  id: string,
  text: string,
  words: BrowserRecognizeResult['words'],
  samples: number,
  source: 'mic' | 'system',
  speakerLabel: string,
  isFinal: boolean,
): BrowserSegment {
  const seg: BrowserSegment = {
    id,
    source,
    speaker: speakerLabel,
    text,
    start: words.length > 0 ? words[0].start : 0,
    end: words.length > 0 ? words[words.length - 1].end : samples / NEMOTRON.sampleRate,
    final: isFinal,
  };
  if (words.length > 0) seg.words = words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
  return seg;
}

export function buildNemotronLanguageInfo(language: string, locked: boolean): BrowserLanguageInfo {
  return { code: language, name: language, locked, confidence: locked ? 1 : 0.5 };
}
