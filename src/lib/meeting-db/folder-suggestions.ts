import type { DatabaseSync } from 'node:sqlite';
import { parseJson } from './row-mapping';

export function declineFolderSuggestionRow(db: DatabaseSync, meetingId: string, folderId: string): boolean {
  const row = db.prepare('SELECT folder_suggestion_declined AS declined FROM meetings WHERE id = ?').get(meetingId);
  if (!row) return false;
  const declined = parseJson<string[]>(row.declined, []);
  if (!declined.includes(folderId)) declined.push(folderId);
  db.prepare('UPDATE meetings SET folder_suggestion_declined = ? WHERE id = ?').run(JSON.stringify(declined), meetingId);
  return true;
}
