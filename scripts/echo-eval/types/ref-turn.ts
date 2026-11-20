import type { MeetingEvent } from './meeting-case';

export interface RefTurn {
  start: number;
  end: number;
  speaker: string;
  text?: string;
  event?: MeetingEvent;
}
