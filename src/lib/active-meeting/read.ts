import fs from 'node:fs';
import { isMeetingId } from '../meeting-db/validate';
import type { ActiveMeeting } from './types';

export const NO_ACTIVE_MEETING: ActiveMeeting = { meetingId: null, isLive: false };

export function readActiveMeeting(file: string): ActiveMeeting {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<ActiveMeeting>;
    if (!isMeetingId(raw.meetingId)) return NO_ACTIVE_MEETING;
    return { meetingId: raw.meetingId, isLive: raw.isLive === true };
  } catch {
    return NO_ACTIVE_MEETING;
  }
}
