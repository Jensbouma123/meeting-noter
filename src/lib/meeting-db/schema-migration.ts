import type { DatabaseSync } from 'node:sqlite';
import { SCHEMA, SCHEMA_VERSION } from './schema';
import { num } from './row-mapping';

const ADDED_COLUMNS = [
  { table: 'meetings', column: 'participants', ddl: 'TEXT' },
  { table: 'meetings', column: 'folder_id', ddl: 'TEXT' },
  { table: 'meetings', column: 'insights', ddl: 'TEXT' },
  { table: 'meetings', column: 'folder_suggestion_declined', ddl: 'TEXT' },
  { table: 'segments', column: 'low_conf_spans', ddl: 'TEXT' },
  { table: 'folders', column: 'roster', ddl: 'TEXT' },
  { table: 'folders', column: 'roster_inherit', ddl: 'INTEGER NOT NULL DEFAULT 1' },
  { table: 'folders', column: 'context', ddl: "TEXT NOT NULL DEFAULT ''" },
] as const;

function columnNames(db: DatabaseSync, table: string): string[] {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => String(c.name));
}

function addMissingColumns(db: DatabaseSync): void {
  const known = new Map<string, string[]>();
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    if (!known.has(table)) known.set(table, columnNames(db, table));
    if (!known.get(table)!.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

export function prepareWritableDatabase(db: DatabaseSync): void {
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
  const version = num(db.prepare('PRAGMA user_version').get()?.user_version ?? 0);
  if (version < SCHEMA_VERSION) {
    db.exec(SCHEMA);
    addMissingColumns(db);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  db.exec("INSERT INTO meetings_fts (meetings_fts, rank) VALUES ('secure-delete', 1)");
}
