import type { Source } from './basics';

export interface SpeakerStat {
  id: string;
  label: string;
  time: number;
  percentage: number;
  colorIndex: number;
  source: Source;
}
