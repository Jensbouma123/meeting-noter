import type { MeetingsDb } from '../lib/meeting-db/db';
import { textResult } from './tool-result';
import type { ToolResult } from './types';

export function createWithDb(openDb: () => MeetingsDb | null) {
  return (fn: (db: MeetingsDb) => ToolResult): ToolResult => {
    let db: MeetingsDb | null = null;
    try {
      db = openDb();
      if (!db) return textResult('Meeting database not found. Open Meeting Noter once to create it.');
      return fn(db);
    } catch (err) {
      console.error('[meeting-noter mcp] database error:', err instanceof Error ? err.message : String(err));
      return textResult('Could not read the meetings database. Open Meeting Noter once, then try again.', true);
    } finally {
      db?.close();
    }
  };
}
