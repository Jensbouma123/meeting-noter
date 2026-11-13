import path from 'node:path';

export const ACTIVE_MEETING_FILE = 'active-meeting.json';

export function activeMeetingPath(dataDir: string): string {
  return path.join(dataDir, ACTIVE_MEETING_FILE);
}
