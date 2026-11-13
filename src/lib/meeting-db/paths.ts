import os from 'node:os';
import path from 'node:path';

export function meetingsDataDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.MEETING_NOTER_DATA_DIR) return env.MEETING_NOTER_DATA_DIR;
  if (env.MEETING_NOTER_ROOT) return env.MEETING_NOTER_ROOT;
  return path.join(os.homedir(), 'Library', 'Application Support', 'Meeting Noter');
}

export function meetingsDbPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(meetingsDataDir(env), 'meetings.db');
}

export function meetingsMarkdownDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(meetingsDataDir(env), 'meetings');
}
