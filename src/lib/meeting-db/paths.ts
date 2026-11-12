import os from 'node:os';
import path from 'node:path';

/**
 * Where meetings live on disk: `meetings.db` and a `meetings/` folder of
 * Markdown copies in the app's data folder, ~/Library/Application Support/
 * Meeting Noter. install.sh only replaces `app/` there, so updates and
 * reinstalls keep them; uninstall.sh keeps them unless asked to delete them.
 * `MEETING_NOTER_DATA_DIR` overrides the folder (tests, a second profile).
 */
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
