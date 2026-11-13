import type { LowConfSpan, SegmentWord } from '../types';
import { LOW_CONFIDENCE_THRESHOLD } from './constants';

export function lowConfidenceSpans(text: string, words: SegmentWord[]): LowConfSpan[] {
  const spans: LowConfSpan[] = [];
  let cursor = 0;
  for (const w of words) {
    const needle = w.text.trim();
    if (!needle) continue;
    const at = text.indexOf(needle, cursor);
    if (at < 0) continue;
    cursor = at + needle.length;
    if (w.confidence !== undefined && w.confidence < LOW_CONFIDENCE_THRESHOLD) {
      const last = spans[spans.length - 1];
      if (last && last[1] >= at) {
        last[1] = cursor;
        last[2] = Math.min(last[2], w.confidence);
      } else {
        spans.push([at, cursor, w.confidence]);
      }
    }
  }
  return spans;
}
