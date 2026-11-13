import { deleteDatabaseWithinDeadline } from '@/lib/asr/browser/model-download/database-delete';
import { D1_INTELLIGENCE_DB_NAME, D1_PURGE_DONE_KEY } from './constants';
import { purgeD1ModelFiles } from './purge-d1-model-files';

function alreadyPurged(): boolean {
  try {
    return localStorage.getItem(D1_PURGE_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markPurged(): void {
  try {
    localStorage.setItem(D1_PURGE_DONE_KEY, '1');
  } catch {
    return;
  }
}

export async function purgeLegacyD1Storage(): Promise<void> {
  if (typeof indexedDB === 'undefined' || alreadyPurged()) return;
  try {
    await purgeD1ModelFiles();
    const outcome = await deleteDatabaseWithinDeadline(D1_INTELLIGENCE_DB_NAME);
    if (outcome === 'deleted') markPurged();
  } catch {
    return;
  }
}
