import fs from 'node:fs';
import path from 'node:path';
import { MeetingsDb, type FolderDeleteMode, type UpsertResult } from './db';
import { markdownFileName, markdownFolderPath, renderMeetingMarkdown } from './markdown';
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
    const relative = markdownFolderPath(this.db.listFolders(), meeting.folderId);
    const file = meeting.isDraft ? null : [relative, markdownFileName(meeting)].filter(Boolean).join('/');
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

  createFolder(name: string, parentId: string | null = null) {
    const folder = this.db.createFolder(name, parentId);
    this.ensureFolderDirectories();
    return folder;
  }

  renameFolder(id: string, name: string) {
    const folder = this.db.renameFolder(id, name);
    this.rewriteAllMarkdown();
    return folder;
  }

  moveFolder(id: string, parentId: string | null) {
    const folder = this.db.moveFolder(id, parentId);
    this.rewriteAllMarkdown();
    return folder;
  }

  moveMeeting(id: string, folderId: string | null): void {
    this.db.moveMeeting(id, folderId);
    const meeting = this.db.get(id);
    if (meeting) this.save(meeting);
  }

  /** Delete a folder; with `delete-contents` also its meetings' Markdown files. */
  deleteFolder(id: string, mode: FolderDeleteMode): { folders: number; meetings: number } {
    const { markdownFiles, ...counts } = this.db.deleteFolder(id, mode);
    for (const name of markdownFiles) this.removeFile(name);
    if (mode === 'move-up') this.rewriteAllMarkdown();
    this.removeEmptyDirectories();
    return counts;
  }

  /** Delete every meeting, every Markdown file in `meetings/` (also stray ones and temp files). */
  deleteAll(): number {
    const { count, markdownFiles } = this.db.deleteAll();
    for (const name of markdownFiles) this.removeFile(name);
    try {
      for (const name of fs.readdirSync(this.markdownDir)) {
        if (name.endsWith('.md') || name.includes('.md.tmp-')) this.removeFile(name);
      }
    } catch {
      // No folder, nothing to remove.
    }
    return count;
  }

  private writeFile(name: string, content: string): void {
    try {
      const target = this.safePath(name);
      if (!target) return;
      fs.mkdirSync(path.dirname(target), { recursive: true });
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
      const target = this.safePath(name);
      if (target) fs.rmSync(target, { force: true });
    } catch (err) {
      console.error('[meetings] could not remove Markdown file', name, err);
    }
  }

  private safePath(name: string): string | null {
    if (!name || path.isAbsolute(name) || name.split(/[\\/]/).some((part) => !part || part === '.' || part === '..')) return null;
    const root = path.resolve(this.markdownDir);
    const target = path.resolve(root, name);
    return target.startsWith(`${root}${path.sep}`) ? target : null;
  }

  private ensureFolderDirectories(): void {
    for (const folder of this.db.listFolders()) {
      const relative = markdownFolderPath(this.db.listFolders(), folder.id);
      const target = this.safePath(relative);
      if (target) fs.mkdirSync(target, { recursive: true });
    }
  }

  private rewriteAllMarkdown(): void {
    for (const row of this.db.list({ includeDrafts: false })) {
      const meeting = this.db.get(row.id);
      if (meeting) this.save(meeting);
    }
    this.ensureFolderDirectories();
    this.removeEmptyDirectories();
  }

  private removeEmptyDirectories(): void {
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(path.join(dir, entry.name));
      }
      if (dir !== this.markdownDir && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    };
    try { walk(this.markdownDir); } catch { /* Missing folder. */ }
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
