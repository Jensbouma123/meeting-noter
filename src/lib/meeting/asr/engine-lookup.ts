import {
  activeAsrManifest,
  areModelFilesCached,
  detectAsrBackend,
  getBrowserASRDownloadManager,
  getModelStatus,
  isConsentGiven,
  markCached,
  markNotCached,
  registerDefaultModels,
  type AsrEngine,
  type AsrModelManifest,
  type ModelEntry,
} from '@/lib/asr/browser';
import { PARQUET_REGISTRY_KEY } from './constants';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { setBlockedReason } from './state-updates';
import { recordDetectedBackend } from './backend';
import { loadEngine } from './engine-load';

async function dropStaleCachedClaim(manifest: AsrModelManifest): Promise<ModelEntry | undefined> {
  const entry = getModelStatus(PARQUET_REGISTRY_KEY);
  if (entry?.status !== 'cached') return entry;
  const onDisk = await areModelFilesCached(manifest);
  if (onDisk.complete) return entry;
  console.warn(
    `[asr] Registry claims the speech model is cached, but ${onDisk.cached} of ` +
      `${onDisk.total} files are actually in IndexedDB — re-downloading.`,
  );
  markNotCached(PARQUET_REGISTRY_KEY);
  return getModelStatus(PARQUET_REGISTRY_KEY);
}

async function downloadConsentedModel(): Promise<boolean> {
  setBlockedReason(null);
  asrState.loading = true;
  notifyBrowserListeners();
  try {
    await getBrowserASRDownloadManager().initiateDownloadsFor(PARQUET_REGISTRY_KEY);
    return true;
  } catch (err) {
    console.error('[asr] Speech model download failed', err);
    asrState.loading = false;
    asrState.engine = null;
    notifyBrowserListeners();
    return false;
  }
}

export async function getBrowserEngine(): Promise<AsrEngine | null> {
  if (!asrState.enabled) return null;

  const backend = await detectAsrBackend();
  recordDetectedBackend(backend);
  const manifest = activeAsrManifest(backend);
  registerDefaultModels(backend);

  const registryEntry = await dropStaleCachedClaim(manifest);

  if (registryEntry?.status === 'cached') {
    return loadEngine(registryEntry.modelRepo, manifest);
  }

  if (registryEntry?.status === 'failed' || registryEntry?.status === 'cancelled' || registryEntry?.status === 'unavailable') {
    setBlockedReason(
      registryEntry.error ??
      'The speech model could not be downloaded. Retry it in Settings › Speech model.',
    );
    return null;
  }

  if (!isConsentGiven(PARQUET_REGISTRY_KEY)) {
    setBlockedReason(
      'The speech model has not been downloaded yet, so nothing is being transcribed. ' +
      'Download it to enable on-device transcription.',
    );
    return null;
  }

  if (!(await downloadConsentedModel())) return null;

  if (registryEntry) {
    markCached(PARQUET_REGISTRY_KEY);
  }
  return loadEngine(registryEntry?.modelRepo, manifest);
}
