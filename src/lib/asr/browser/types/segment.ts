import type { BrowserWord } from './word';

export interface BrowserSegment {
  id: string;
  source: 'mic' | 'system';
  speaker: string;
  text: string;
  start: number;
  end: number;
  final: boolean;
  words?: BrowserWord[];
}
