import fs from 'node:fs';
import path from 'node:path';
import type { ActiveMeeting } from './types';

export function writeActiveMeeting(file: string, value: ActiveMeeting): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}
