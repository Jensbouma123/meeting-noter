import { getState } from './model-registry-snapshot';
import { isConsentGiven, onConsentDeclined, resetConsent } from './model-registry-consent';
import { markCancelled, markNotCached, resetAllEntries } from './model-registry-status';
import { setDialogVisible } from './model-registry-dialog';
import type { ModelEntry, ModelEntryConfig } from './types/model-registry';
import {
  abortInFlightDownloads,
  closeModelCacheConnections,
  deleteModelCache,
  isDownloadCancelled,
  type DeleteModelCacheResult,
} from './resumable-download';
import { fallBackAfterMissingEncoder } from './browser-asr-download-fallback';
import { downloadEntryFiles } from './browser-asr-download-run';
import { probeRegisteredModelSizes } from './browser-asr-download-sizes';
import { currentAttempts, downloadState } from './browser-asr-download-state';

export { formatBytes, formatSeconds } from './browser-asr-download-format';
export { probeRegisteredModelSizes } from './browser-asr-download-sizes';
export { registerDownloadHandler } from './browser-asr-download-state';

onConsentDeclined(() => cancelDownloads());

function isFinishedOrUnavailable(entry: ModelEntry): boolean {
  return entry.status === 'cached' || entry.status === 'unavailable';
}

export async function initiateDownloads(): Promise<void> {
  await probeRegisteredModelSizes();

  const entryKeys = Object.keys(getState().entries);
  const modelsToDownload = entryKeys.filter((key) => {
    const entry = getState().entries[key];
    if (!entry) return false;
    if (isFinishedOrUnavailable(entry)) return false;
    return isConsentGiven(key);
  });

  await Promise.all(modelsToDownload.map((key) => downloadOrJoin(key)));
}

function downloadOrJoin(key: string): Promise<void> {
  if (key in downloadState.promises) return downloadState.promises[key];
  const entry = getState().entries[key];
  if (!entry) return Promise.resolve();
  const downloadPromise: Promise<void> = downloadWithFallback(key, entry).finally(() => {
    if (downloadState.promises[key] === downloadPromise) delete downloadState.promises[key];
  });
  downloadState.promises[key] = downloadPromise;
  return downloadPromise;
}

async function downloadWithFallback(key: string, entry: ModelEntry): Promise<void> {
  try {
    await downloadEntryFiles(key, entry);
  } catch (err) {
    if (isDownloadCancelled(err) || !fallBackAfterMissingEncoder(entry, err)) throw err;
    const replacement = getState().entries[key];
    if (!replacement) throw err;
    await downloadWithFallback(key, replacement);
  }
}

async function initiateDownloadsFor(key: string): Promise<void> {
  const entry = getState().entries[key];
  if (!entry) return;
  if (isFinishedOrUnavailable(entry)) return;
  await downloadOrJoin(key);
}

export function autoResumeConsentedDownloads(): void {
  if (typeof window === 'undefined') return;
  const entries = getState().entries;
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (!entry) continue;
    if (isFinishedOrUnavailable(entry)) continue;
    if (!isConsentGiven(key)) continue;
    void initiateDownloadsFor(key);
  }
}

export function cancelDownloads(): void {
  const keys = Object.keys(downloadState.promises);
  if (keys.length > 0) abortInFlightDownloads();
  for (const key of keys) {
    markCancelled(key);
  }
  currentAttempts.clear();
  downloadState.promises = {};
}

export async function retryDownload(key: string): Promise<void> {
  const entry = getState().entries[key];
  if (!entry) return;
  if (key in downloadState.promises) {
    await downloadState.promises[key];
    return;
  }
  markNotCached(key);
  await initiateDownloadsFor(key);
}

export function getRegisteredModels(): ModelEntryConfig[] {
  return Object.values(getState().entries).map((e) => ({
    key: e.key,
    modelRepo: e.modelRepo,
    displayName: e.displayName,
    estimatedSizeBytes: e.estimatedSizeBytes,
    description: e.description,
    fromHubOptions: e.fromHubOptions,
    backend: e.backend,
    kind: e.kind,
  }));
}

export async function deleteDownloadedModels(): Promise<DeleteModelCacheResult> {
  abortInFlightDownloads();
  const inFlight = Object.values(downloadState.promises);
  cancelDownloads();
  closeModelCacheConnections();
  if (inFlight.length > 0) await Promise.allSettled(inFlight);
  const result = await deleteModelCache();
  resetAllEntries();
  resetConsent();
  setDialogVisible(false);
  return result;
}

export type { ModelEntry, ModelEntryConfig, ModelProgress, ModelStatus } from './types/model-registry';
export { subscribeRegistry, notifyListeners } from './model-registry-state';
export { getState, getServerSnapshot } from './model-registry-snapshot';
export { updateProgress } from './model-registry-progress';
export { setEstimatedSize, markFailed, markCancelled, markCached, markUnavailable } from './model-registry-status';
export { registerModel } from './model-registry-register';

export function getBrowserASRDownloadManager() {
  return { initiateDownloadsFor };
}
