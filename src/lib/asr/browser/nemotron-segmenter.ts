import { buildNemotronSegment, nextNemotronSegmentId } from './nemotron-segments';
import type { BrowserRecognizeResult, BrowserSegment } from './types';

export class NemotronSegmenter {
  private buffer = '';
  private currentId = '';

  reset(): void {
    this.buffer = '';
    this.currentId = '';
  }

  build(
    text: string,
    words: BrowserRecognizeResult['words'],
    samples: number,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): BrowserSegment[] {
    if (!text && !this.buffer) return [];
    this.buffer = `${this.buffer} ${text}`.trim();
    if (!this.currentId) this.currentId = nextNemotronSegmentId();
    const seg = buildNemotronSegment(this.currentId, this.buffer, words, samples, source, speakerLabel, isFinal);
    if (isFinal) this.reset();
    return [seg];
  }
}
