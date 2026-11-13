import { FILE_STORE, LEGACY_DB_NAMES, LEGACY_SWEEP_DONE_KEY } from './constants';
import { deleteDatabaseWithinDeadline } from './database-delete';
import { requestOnce } from './idb-request';

async function readSweepFlag(db: IDBDatabase): Promise<{ done: boolean } | undefined> {
  const tx = db.transaction(FILE_STORE, 'readonly');
  const value = await requestOnce<{ done: boolean } | undefined>(
    tx.objectStore(FILE_STORE).get(LEGACY_SWEEP_DONE_KEY),
  );
  return value ?? undefined;
}

function writeSweepFlag(db: IDBDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(FILE_STORE, 'readwrite');
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Transaction on "${FILE_STORE}" failed`));
    tx.onabort = () => reject(tx.error ?? new Error(`Transaction on "${FILE_STORE}" aborted`));
    tx.objectStore(FILE_STORE).put({ done: true } as never, LEGACY_SWEEP_DONE_KEY);
  });
}

export function dropLegacyDatabases(db: IDBDatabase): void {
  void readSweepFlag(db)
    .catch(() => undefined)
    .then((flag) => {
      if (flag) return;
      void writeSweepFlag(db).catch(() => {});
      for (const name of LEGACY_DB_NAMES) {
        void deleteDatabaseWithinDeadline(name).then((outcome) => {
          if (outcome === 'deleted') {
            console.debug(
              `[resumable-download] Dropped the legacy cache database "${name}": its whole-file ` +
                'Blob records are in a format this app no longer reads. Models will be ' +
                'downloaded again once, into the chunked cache.',
            );
          }
        });
      }
    });
}
