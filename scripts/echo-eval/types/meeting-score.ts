import type { MeetingEvent, MeetingLang, MeetingPairing, MeetingRole } from './meeting-case';

export interface TurnScore {
  speaker: string;
  role: MeetingRole;
  lang: 'nl' | 'en';
  event: MeetingEvent;
  heard: boolean;
  kept: boolean;
  lost: boolean;
  dups: number;
}

export interface PairScore {
  pairing: MeetingPairing;
  overlapFrac: number;
  lang: MeetingLang;
  bothKept: boolean;
  merged: boolean;
  echoMarked: boolean;
}

export interface MeetingScore {
  id: string;
  split: 'dev' | 'heldout';
  lang: MeetingLang;
  truthSpeakers: number;
  shownSpeakers: number;
  phantomSpeakers: number;
  lostSpeakers: number;
  junkMicLines: number;
  turns: TurnScore[];
  pairs: PairScore[];
}
