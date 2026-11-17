import type { TranscriptItem } from './LiveTranscript.types';

export interface SearchRootOptions {
  el: HTMLElement;
  lines: TranscriptItem[];
  onJump: (segId: string, index: number) => void;
}
