import type { DatabaseSync } from 'node:sqlite';
import type { InsightSet } from '../semantic-search/insights/types/insight-set';

export function readDeletedIds(db: DatabaseSync): string[] {
  return db
    .prepare('SELECT id FROM deleted_meetings')
    .all()
    .map((row) => String(row.id));
}

export function readMeta(db: DatabaseSync, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? String(row.value) : null;
}

export function writeMeta(db: DatabaseSync, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

export function writeMetaOnce(db: DatabaseSync, key: string, value: string): boolean {
  return Number(db.prepare('INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)').run(key, value).changes) > 0;
}

export function writeInsights(db: DatabaseSync, id: string, insights: InsightSet | null): boolean {
  const json = insights === null ? null : JSON.stringify(insights);
  return Number(db.prepare('UPDATE meetings SET insights = ? WHERE id = ?').run(json, id).changes) > 0;
}

export function readMarkdownFile(db: DatabaseSync, id: string): string | null {
  const row = db.prepare('SELECT markdown_file FROM meetings WHERE id = ?').get(id);
  return row && row.markdown_file !== null ? String(row.markdown_file) : null;
}
