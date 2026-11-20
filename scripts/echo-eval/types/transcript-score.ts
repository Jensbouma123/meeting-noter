import type { MeetingEvent } from './meeting-case';

export interface WerScore {
  refWords: number;
  hypWords: number;
  edits: number;
  wer: number;
}

export interface SpeakerWer extends WerScore {
  speaker: string;
  label: string | null;
}

export interface DerScore {
  scoredSec: number;
  missSec: number;
  falseAlarmSec: number;
  confusionSec: number;
  der: number;
}

export interface OverSplit {
  event: MeetingEvent;
  lines: number;
}

export interface TranscriptScore {
  wer: WerScore | null;
  speakerWer: SpeakerWer[];
  der: DerScore | null;
  keptLines: number;
  overSplit: OverSplit[];
}
