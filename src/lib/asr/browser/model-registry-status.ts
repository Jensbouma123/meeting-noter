import { persistEntries } from './model-registry-persistence';
import {
  emptyProgress,
  notifyListeners,
  patchEntry,
  registryState,
} from './model-registry-state';

function commit(): void {
  notifyListeners();
  persistEntries();
}

export function markCached(key: string): void {
  if (!patchEntry(key, { status: 'cached', isReady: true })) return;
  commit();
}

export function markNotCached(key: string, reason?: string): void {
  const entry = registryState.entries[key];
  if (!entry) return;
  patchEntry(key, {
    status: 'not-downloaded',
    isReady: false,
    wasCancelled: false,
    progress: emptyProgress(entry.estimatedSizeBytes),
    error: reason ?? null,
  });
  commit();
}

export function markFailed(key: string, message: string): void {
  if (!patchEntry(key, { status: 'failed', error: message, isReady: false })) return;
  commit();
}

export function markCancelled(key: string): void {
  if (!patchEntry(key, { status: 'cancelled', wasCancelled: true, isReady: false })) return;
  commit();
}

export function markUnavailable(key: string): void {
  if (!patchEntry(key, {
    status: 'unavailable',
    error: 'Model unavailable in this browser.',
    isReady: false,
  })) return;
  commit();
}

export function markDownloading(key: string, totalBytes: number): void {
  if (!patchEntry(key, {
    status: 'downloading',
    error: null,
    wasCancelled: false,
    isReady: false,
    progress: { ...emptyProgress(totalBytes), resuming: false },
  })) return;
  commit();
}

export function setEstimatedSize(key: string, sizeBytes: number): void {
  const entry = registryState.entries[key];
  if (!entry || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return;
  patchEntry(key, {
    estimatedSizeBytes: sizeBytes,
    ...(entry.status === 'downloading'
      ? { progress: { ...entry.progress, totalBytes: sizeBytes } }
      : {}),
  });
  commit();
}

export function resetAllEntries(): void {
  for (const [key, entry] of Object.entries(registryState.entries)) {
    patchEntry(key, {
      status: entry.status === 'unavailable' ? 'unavailable' : 'not-downloaded',
      error: null,
      wasCancelled: false,
      isReady: false,
      progress: emptyProgress(entry.estimatedSizeBytes),
    });
  }
  commit();
}
