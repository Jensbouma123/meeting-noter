import { UPDATE_REFRESH_MS } from './constants';
import { checkForUpdate } from './updateCheck';
import { getUpdateSnapshot, listeners, publish, readDismissedVersion } from './updateState';

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function subscribeToUpdate(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    publish({ ...getUpdateSnapshot(), dismissedVersion: readDismissedVersion() });
    void checkForUpdate();
    refreshTimer = setInterval(() => { void checkForUpdate(); }, UPDATE_REFRESH_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };
}
