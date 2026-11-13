import { persistEntries } from './model-registry-persistence';
import { notifyListeners, patchEntry, registryState } from './model-registry-state';

const PROGRESS_NOTIFY_MS = 250;
const PROGRESS_PERSIST_MS = 3_000;

function percentOf(loadedBytes: number, totalBytes: number): number {
  return totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
}

export function updateProgress(
  key: string,
  loadedBytes: number,
  totalBytes: number,
  currentFile: string,
  throughputBytesPerSec: number,
  etaSeconds: number,
  resuming = false,
): void {
  if (!patchEntry(key, {
    progress: {
      loadedBytes,
      totalBytes,
      currentFile,
      throughputBytesPerSec,
      etaSeconds,
      percent: percentOf(loadedBytes, totalBytes),
      resuming,
    },
  })) return;
  const now = Date.now();
  if (now - registryState.lastProgressPersistAt >= PROGRESS_PERSIST_MS) persistEntries();
  if (now - registryState.lastProgressNotifyAt >= PROGRESS_NOTIFY_MS) {
    notifyListeners();
  } else if (registryState.pendingProgressNotify === null) {
    registryState.cachedSnapshot = null;
    registryState.pendingProgressNotify = setTimeout(
      notifyListeners,
      PROGRESS_NOTIFY_MS - (now - registryState.lastProgressNotifyAt),
    );
  } else {
    registryState.cachedSnapshot = null;
  }
}
