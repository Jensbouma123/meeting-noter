import fs from 'node:fs';
import path from 'node:path';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';
import { MeetingsDb } from './db';
import { markdownFileName, markdownFolderPath, renderMeetingMarkdown } from './markdown';
import { removeEmptyDirectories, removeMarkdownFile, resolveInsideRoot, writeMarkdownFile } from './markdown-files';
import { meetingsDbPath, meetingsMarkdownDir } from './paths';
import type { FolderDeleteMode, StoredMeeting, UpsertResult } from './types';

export class MeetingStore {
  constructor(
    readonly db: MeetingsDb,
    readonly markdownDir: string,
  ) {}

  save(meeting: StoredMeeting, opts: { onlyIfNewer?: boolean } = {}): UpsertResult {
    const previous = this.db.markdownFile(meeting.id);
    const relative = markdownFolderPath(this.db.listFolders(), meeting.folderId);
    const file = meeting.isDraft ? null : [relative, markdownFileName(meeting)].filter(Boolean).join('/');
    const result = this.db.upsert(meeting, { ...opts, markdownFile: file });
    if (result !== 'written') return result;
    if (previous && previous !== file) this.removeFile(previous);
    if (file) writeMarkdownFile(this.markdownDir, file, renderMeetingMarkdown(meeting));
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

  reorderFolder(id: string, index: number) {
    const folder = this.db.reorderFolder(id, index);
    this.rewriteAllMarkdown();
    return folder;
  }

  moveMeeting(id: string, folderId: string | null): void {
    this.db.moveMeeting(id, folderId);
    const meeting = this.db.get(id);
    if (meeting) this.save(meeting);
  }

  setInsights(id: string, insights: InsightSet | null): boolean {
    if (!this.db.setInsights(id, insights)) return false;
    const meeting = this.db.get(id);
    if (meeting) this.save(meeting);
    return true;
  }

  deleteFolder(id: string, mode: FolderDeleteMode): { folders: number; meetings: number } {
    const { markdownFiles, ...counts } = this.db.deleteFolder(id, mode);
    for (const name of markdownFiles) this.removeFile(name);
    if (mode === 'move-up') this.rewriteAllMarkdown();
    removeEmptyDirectories(this.markdownDir);
    return counts;
  }

  deleteAll(): number {
    const { count, markdownFiles } = this.db.deleteAll();
    for (const name of markdownFiles) this.removeFile(name);
    try {
      for (const name of fs.readdirSync(this.markdownDir)) {
        if (name.endsWith('.md') || name.includes('.md.tmp-')) this.removeFile(name);
      }
    } catch {
      return count;
    }
    return count;
  }

  private removeFile(name: string): void {
    removeMarkdownFile(this.markdownDir, name);
  }

  private ensureFolderDirectories(): void {
    for (const folder of this.db.listFolders()) {
      const relative = markdownFolderPath(this.db.listFolders(), folder.id);
      const target = resolveInsideRoot(this.markdownDir, relative);
      if (target) fs.mkdirSync(target, { recursive: true });
    }
  }

  private rewriteAllMarkdown(): void {
    for (const row of this.db.list({ includeDrafts: false })) {
      const meeting = this.db.get(row.id);
      if (meeting) this.save(meeting);
    }
    this.ensureFolderDirectories();
    removeEmptyDirectories(this.markdownDir);
  }
}

let shared: { file: string; store: MeetingStore } | null = null;

export function meetingStore(): MeetingStore {
  const file = meetingsDbPath();
  if (shared?.file !== file) {
    shared?.store.db.close();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    shared = { file, store: new MeetingStore(new MeetingsDb(file), meetingsMarkdownDir()) };
  }
  return shared.store;
}
