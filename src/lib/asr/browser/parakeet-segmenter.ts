import type { ParakeetModel, TranscribeResult } from 'parakeet.js';
import { buildSegment, nextSegmentId } from './parakeet-segments';
import { WARMUP_SAMPLE_RATE } from './parakeet-loader';
import type { BrowserSegment } from './types';

export class ParakeetSegmenter {
  private buffer = '';
  private currentId = '';
  private decoderState: TranscribeResult['decoderState'] = undefined;

  resetText(): void {
    this.buffer = '';
    this.currentId = '';
  }

  resetDecoder(): void {
    this.decoderState = undefined;
  }

  async transcribeChunk(
    model: ParakeetModel,
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserSegment[]> {
    const result = await model.transcribe(audio, WARMUP_SAMPLE_RATE, {
      previousDecoderState: this.decoderState,
      returnDecoderState: true,
      returnTimestamps: true,
      timeOffset: 0,
      enableProfiling: false,
    });
    this.decoderState = result.decoderState;
    return this.build(result, source, speakerLabel, isFinal);
  }

  private build(
    result: TranscribeResult,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): BrowserSegment[] {
    const text = result.utterance_text.trim();
    if (!text && !this.buffer) return [];

    this.buffer += ' ' + text;
    const fullText = this.buffer.trim();

    if (!this.currentId) this.currentId = nextSegmentId();

    const seg = buildSegment(result, this.currentId, fullText, source, speakerLabel, isFinal);

    if (isFinal) this.resetText();

    return [seg];
  }
}
