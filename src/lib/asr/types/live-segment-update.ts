import type { TimelineWord } from './timeline-word';

export interface LiveSegmentUpdate {
  id: string;
  text: string;
  startSample: number;
  endSample: number;
  final: boolean;
  words: TimelineWord[];
}
