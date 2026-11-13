import type { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema';
import { num } from './row-mapping';

function columnNames(db: DatabaseSync, table: string): string[] {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => String(c.name));
}

export function prepareWritableDatabase(db: DatabaseSync): void {
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
  const version = num(db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
  if (version < SCHEMA_VERSION) {
    db.exec(SCHEMA);
    const meetingColumns = columnNames(db, 'meetings');
    if (!meetingColumns.includes('participants')) db.exec('ALTER TABLE meetings ADD COLUMN participants TEXT');
    if (!meetingColumns.includes('folder_id')) db.exec('ALTER TABLE meetings ADD COLUMN folder_id TEXT');
    if (!columnNames(db, 'segments').includes('low_conf_spans')) db.exec('ALTER TABLE segments ADD COLUMN low_conf_spans TEXT');
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  db.exec("INSERT INTO meetings_fts (meetings_fts, rank) VALUES ('secure-delete', 1)");
}
