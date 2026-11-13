import type { DatabaseSync } from 'node:sqlite';

export function scrubDeletedText(db: DatabaseSync, vacuum: boolean): void {
  try {
    if (vacuum) db.exec('VACUUM');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    return;
  }
}
