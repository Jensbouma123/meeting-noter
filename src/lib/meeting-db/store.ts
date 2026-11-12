import fs from 'node:fs';
import path from 'node:path';
import { MeetingsDb, type UpsertResult } from './db';
import { markdownFileName, renderMeetingMarkdown } from './markdown';
import { meetingsDbPath, meetingsMarkdownDir } from './paths';
import type { StoredMeeting } from './types';

/**
 * The server's write path: the DB plus one Markdown file per meeting in
 * `meetings/` next to it. The DB is the source of truth; a Markdown file that
 * fails to write is logged and rewritten on the meeting's next save.
 */
export class MeetingStore {
  constructor(
    readonly db: MeetingsDb,
    readonly markdownDir: string,
  ) {}

  save(meeting: StoredMeeting, opts: { onlyIfNewer?: boolean } = {}): UpsertResult {
    const previous = this.db.markdownFile(meeting.id);
    // Drafts have nothing to read yet; their file appears with the first line.
    const file = meeting.isDraft ? null : markdownFileName(meeting);
    const result = this.db.upsert(meeting, { ...opts, markdownFile: file });
    if (result !== 'written') return result;
    if (previous && previous !== file) this.removeFile(previous);
    if (file) this.writeFile(file, renderMeetingMarkdown(meeting));
    return result;
  }

  delete(id: string): boolean {
    const { deleted, markdownFile } = this.db.delete(id);
    if (markdownFile) this.removeFile(markdownFile);
    return deleted;
  }

  private writeFile(name: string, content: string): void {
    try {
      fs.mkdirSync(this.markdownDir, { recursive: true });
      const target = path.join(this.markdownDir, name);
      // Write then rename, so a reader never sees half a file.
      const tmp = `${target}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, target);
    } catch (err) {
      console.error('[meetings] could not write Markdown file', name, err);
    }
  }

  private removeFile(name: string): void {
    try {
      fs.rmSync(path.join(this.markdownDir, path.basename(name)), { force: true });
    } catch (err) {
      console.error('[meetings] could not remove Markdown file', name, err);
    }
  }
}

let shared: { file: string; store: MeetingStore } | null = null;

/**
 * The process-wide store for the API routes, opened (and the folder made) on
 * first use; reopened when MEETING_NOTER_DATA_DIR points somewhere else (tests).
 */
export function meetingStore(): MeetingStore {
  const file = meetingsDbPath();
  if (shared?.file !== file) {
    shared?.store.db.close();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    shared = { file, store: new MeetingStore(new MeetingsDb(file), meetingsMarkdownDir()) };
  }
  return shared.store;
}
