import type { BleedParams } from './bleed-params';

export type MeetingRole = 'local' | 'remote';
export type MeetingEvent = 'turn' | 'interrupt' | 'backchannel';
export type MeetingPairing = 'remote+remote' | 'local+local' | 'local+remote';
export type MeetingLang = 'nl' | 'en' | 'mixed';

export interface MeetingSpeaker {
  id: string;
  role: MeetingRole;
  lang: 'nl' | 'en';
}

export interface MeetingTurn {
  utt: string;
  speaker: string;
  role: MeetingRole;
  lang: 'nl' | 'en';
  event: MeetingEvent;
  startSec: number;
  endSec: number;
  clipSec: number | null;
  pairId: number | null;
  pairing: MeetingPairing | null;
  overlapFrac: number | null;
}

export interface MeetingCase {
  id: string;
  split: 'dev' | 'heldout';
  lang: MeetingLang;
  speakers: MeetingSpeaker[];
  bleed: BleedParams | null;
  turns: MeetingTurn[];
  durationSec: number;
}
