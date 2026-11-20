import type { MeetingEvent, MeetingLang, MeetingPairing, MeetingRole } from './meeting-case';

export interface ScoredSegment {
  source: 'mic' | 'system';
  text: string;
  start: number;
  end: number;
  kept?: boolean;
  label?: string | null;
}

export interface ScoredMeetingResult {
  id: string;
  split: 'dev' | 'heldout';
  segments: ScoredSegment[];
}

export interface TurnScore {
  speaker: string;
  role: MeetingRole;
  lang: 'nl' | 'en';
  event: MeetingEvent;
  pairing: MeetingPairing | null;
  overlapFrac: number | null;
  heard: boolean;
  kept: boolean;
  lost: boolean;
  dups: number;
  attributed: boolean | null;
  merged: boolean;
}

export interface PairScore {
  pairing: MeetingPairing;
  overlapFrac: number;
  lang: MeetingLang;
  bothKept: boolean;
  bothAttributed: boolean | null;
  merged: boolean;
  echoMarked: boolean;
}

export interface SpeakerScore {
  speaker: string;
  role: MeetingRole;
  lang: 'nl' | 'en';
  label: string | null;
  turns: number;
  kept: number;
  attributed: number;
  lost: number;
}

export interface MeetingScore {
  id: string;
  split: 'dev' | 'heldout';
  lang: MeetingLang;
  labeled: boolean;
  truthSpeakers: number;
  shownSpeakers: number;
  phantomSpeakers: number;
  lostSpeakers: number;
  mergedLines: number;
  junkMicLines: number;
  turns: TurnScore[];
  pairs: PairScore[];
  speakers: SpeakerScore[];
  labelMap: Record<string, string>;
}
