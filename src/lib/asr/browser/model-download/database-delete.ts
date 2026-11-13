import { DELETE_DEADLINE_MS } from './constants';

export function closeQuietly(db: IDBDatabase | null): void {
  try {
    db?.close();
  } catch {
    return;
  }
}

export function deleteDatabaseWithinDeadline(
  name: string,
  timeoutMs = DELETE_DEADLINE_MS,
): Promise<'deleted' | 'blocked'> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: 'deleted' | 'blocked') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const timer = setTimeout(() => {
      console.warn(
        `[resumable-download] "${name}" is held open by another connection; ` +
          'continuing without clearing it.',
      );
      finish('blocked');
    }, timeoutMs);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.deleteDatabase(name);
    } catch {
      finish('deleted');
      return;
    }
    request.onsuccess = () => finish('deleted');
    request.onerror = () => finish('deleted');
    request.onblocked = () => {};
  });
}
