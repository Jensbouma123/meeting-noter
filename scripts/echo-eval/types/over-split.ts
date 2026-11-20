import type { MeetingEvent } from './meeting-case';

/** App lines covering one scored reference turn; over-split when `lines` > 2. */
export interface TurnLines {
  event: MeetingEvent;
  lines: number;
}
