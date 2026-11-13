import type { Source } from './source';

export interface SpeakerTurn {
  speaker: string;
  source: Source;
  start: number;
  end: number;
  id?: string;
  final?: boolean;
  continues?: boolean;
}
