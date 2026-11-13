import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installRoot } from './sandbox';

export function seedMeetings() {
  const root = installRoot();
  for (const f of ['meetings.db', 'meetings.db-wal', 'meetings.db-shm']) writeFileSync(path.join(root, f), f);
  mkdirSync(path.join(root, 'meetings'), { recursive: true });
  writeFileSync(path.join(root, 'meetings/2026-11-12-standup-abc.md'), '# Standup\n');
}
