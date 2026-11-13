import type { DatabaseSync } from 'node:sqlite';
import { folderSubtreeIds, readFolder } from './folder-queries';
import type { DeleteAllResult, FolderDeleteMode, FolderDeleteResult, MeetingDeleteResult } from './types';

export function deleteMeetingRows(db: DatabaseSync, id: string, now: number): MeetingDeleteResult {
  db.prepare('INSERT OR IGNORE INTO deleted_meetings (id, deleted_at) VALUES (?, ?)').run(id, now);
  const row = db.prepare('SELECT rowid, markdown_file FROM meetings WHERE id = ?').get(id);
  if (!row) return { deleted: false, markdownFile: null };
  db.prepare('DELETE FROM meetings_fts WHERE rowid = ?').run(row.rowid);
  db.prepare('DELETE FROM segments WHERE meeting_id = ?').run(id);
  db.prepare('DELETE FROM speakers WHERE meeting_id = ?').run(id);
  db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
  return { deleted: true, markdownFile: row.markdown_file === null ? null : String(row.markdown_file) };
}

export function deleteFolderRows(db: DatabaseSync, id: string, mode: FolderDeleteMode, now: number): FolderDeleteResult {
  const folder = readFolder(db, id);
  if (mode === 'move-up') {
    db.prepare('UPDATE folders SET parent_id = ?, updated_at = ? WHERE parent_id = ?').run(folder.parentId, now, id);
    db.prepare('UPDATE meetings SET folder_id = ?, updated_at = MAX(updated_at + 1, ?) WHERE folder_id = ?').run(
      folder.parentId,
      now,
      id,
    );
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return { folders: 1, meetings: 0, markdownFiles: [] };
  }
  const ids = folderSubtreeIds(db, id);
  const marks = ids.map(() => '?').join(',');
  const meetingIds = db
    .prepare(`SELECT id FROM meetings WHERE folder_id IN (${marks})`)
    .all(...ids)
    .map((r) => String(r.id));
  const markdownFiles: string[] = [];
  for (const meetingId of meetingIds) {
    const result = deleteMeetingRows(db, meetingId, now);
    if (result.markdownFile) markdownFiles.push(result.markdownFile);
  }
  db.prepare(`DELETE FROM folders WHERE id IN (${marks})`).run(...ids);
  return { folders: ids.length, meetings: meetingIds.length, markdownFiles };
}

export function deleteAllMeetingRows(db: DatabaseSync, now: number): DeleteAllResult {
  const rows = db.prepare('SELECT id, markdown_file FROM meetings').all();
  db.prepare('INSERT OR IGNORE INTO deleted_meetings (id, deleted_at) SELECT id, ? FROM meetings').run(now);
  db.exec('DELETE FROM meetings_fts; DELETE FROM segments; DELETE FROM speakers; DELETE FROM meetings');
  return {
    count: rows.length,
    markdownFiles: rows.flatMap((r) => (r.markdown_file === null ? [] : [String(r.markdown_file)])),
  };
}
