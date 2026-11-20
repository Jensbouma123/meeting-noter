import type { MeetingEvent } from './meeting-case';

/** One reference speaker turn, in seconds; `text` is only needed for WER. */
export interface RefTurn {
  start: number;
  end: number;
  speaker: string;
  text?: string;
  event?: MeetingEvent;
}
