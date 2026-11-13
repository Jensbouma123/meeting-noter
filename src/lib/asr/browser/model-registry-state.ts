import type { AsrBackend } from './model-manifest';
import type {
  ConsentState,
  ModelEntry,
  ModelProgress,
  RegistryState,
} from './types/model-registry';

export const registryState = {
  entries: {} as Record<string, ModelEntry>,
  dialogVisible: null as boolean | null,
  persistedConsent: null as ConsentState | null,
  activeBackend: null as AsrBackend | null,
  cachedSnapshot: null as RegistryState | null,
  lastProgressNotifyAt: 0,
  lastProgressPersistAt: 0,
  pendingProgressNotify: null as ReturnType<typeof setTimeout> | null,
};

const listeners = new Set<() => void>();

export function patchEntry(key: string, patch: Partial<ModelEntry>): ModelEntry | undefined {
  const entry = registryState.entries[key];
  if (!entry) return undefined;
  const next = { ...entry, ...patch };
  registryState.entries = { ...registryState.entries, [key]: next };
  return next;
}

export function emptyProgress(totalBytes: number): ModelProgress {
  return {
    loadedBytes: 0,
    totalBytes,
    currentFile: '',
    throughputBytesPerSec: 0,
    etaSeconds: 0,
    percent: 0,
  };
}

export function notifyListeners(): void {
  if (registryState.pendingProgressNotify !== null) {
    clearTimeout(registryState.pendingProgressNotify);
    registryState.pendingProgressNotify = null;
  }
  registryState.lastProgressNotifyAt = Date.now();
  registryState.cachedSnapshot = null;
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function subscribeRegistry(fn: () => void): () => void {
  return subscribe(fn);
}
