import { useEffect, useSyncExternalStore } from 'react';
import { formatBytes, initiateDownloads, retryDownload } from '@/lib/asr/browser';
import { useModelSizesKnown } from '@/components/models/useModelSizesKnown';
import { getServerSnapshot, getState } from '@/lib/asr/browser/model-registry-snapshot';
import { recordConsent } from '@/lib/asr/browser/model-registry-consent';
import { setDialogVisible } from '@/lib/asr/browser/model-registry-dialog';
import { subscribeRegistry } from '@/lib/asr/browser/model-registry-state';
import type { OnboardingModels } from './types';

export function useOnboardingModels(): OnboardingModels {
  const { entries } = useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
  const sizeKnown = useModelSizesKnown(entries);
  const list = Object.values(entries).filter((e) => e.status !== 'unavailable');
  const modelsReady = list.length > 0 && list.every((e) => e.status === 'cached');
  const downloading = list.filter((e) => e.status === 'downloading');
  const failed = list.some((e) => e.status === 'failed');
  const missing = list.filter((e) => e.status !== 'cached');
  const totalBytes = missing.reduce((sum, e) => sum + e.estimatedSizeBytes, 0);
  const loaded = downloading.reduce((sum, e) => sum + e.progress.loadedBytes, 0);
  const total = downloading.reduce((sum, e) => sum + e.progress.totalBytes, 0);
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  useEffect(() => {
    setDialogVisible(false);
  }, []);

  const startDownload = () => {
    const keys = Object.keys(entries);
    recordConsent('accepted', keys);
    const failedKeys = keys.filter((k) => entries[k]?.status === 'failed');
    const run = failedKeys.length > 0
      ? Promise.all(failedKeys.map((k) => retryDownload(k)))
      : initiateDownloads();
    void run.catch(() => undefined);
  };

  return {
    list,
    modelsReady,
    downloading,
    failed,
    percent,
    sizeText: sizeKnown ? formatBytes(totalBytes) : '…',
    startDownload,
  };
}
