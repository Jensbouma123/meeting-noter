import type { NemotronSegmenter } from './nemotron-segmenter';
import type { BrowserTranscribeResult, NemotronResult } from './types';

export interface NemotronChunk {
  audio: Float32Array;
  source: 'mic' | 'system';
  speakerLabel: string;
  isFinal: boolean;
}

export interface NemotronChunkTranscribeDeps {
  segmenter: NemotronSegmenter;
  recognize: () => Promise<NemotronResult>;
  language: () => BrowserTranscribeResult['language'];
  onError: (message: string) => void;
}
