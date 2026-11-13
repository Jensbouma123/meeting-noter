'use client';

import '@/lib/meeting/asr/init';
import { useMemo, useSyncExternalStore } from 'react';
import { getServerBrowserASRProgress, getBrowserASRProgress } from '@/lib/meeting/asr/progress-build';
import { subscribeBrowserASR } from '@/lib/meeting/asr/listeners';
import {
  getState as getModelRegistryState,
  getServerSnapshot as getModelRegistryServerSnapshot,
  subscribeRegistry,
} from '@/lib/asr/browser';
import { asrModelEntry } from '@/components/meeting/modelEntries';
import type { ModelEntry } from '@/lib/asr/browser';
import type { ModelPreparationState } from './types';

function downloadPercentOf(progress: ModelEntry['progress'] | null): number | null {
  if (!progress) return null;
  if (progress.resuming) return null;
  if (!Number.isFinite(progress.totalBytes) || progress.totalBytes <= 0) return null;
  return Math.max(0, Math.min(99, Math.round((progress.loadedBytes / progress.totalBytes) * 100)));
}

export function useModelPreparation(): ModelPreparationState {
  const registry = useSyncExternalStore(
    subscribeRegistry,
    getModelRegistryState,
    getModelRegistryServerSnapshot,
  );
  const engine = useSyncExternalStore(
    subscribeBrowserASR,
    getBrowserASRProgress,
    getServerBrowserASRProgress,
  );

  return useMemo(() => {
    const asrEntry = asrModelEntry(Object.values(registry.entries));
    const progress = asrEntry?.status === 'downloading' ? asrEntry.progress : null;
    return {
      asrEntry,
      downloadPercent: downloadPercentOf(progress),
      downloadLoadedBytes: progress?.loadedBytes ?? 0,
      downloadTotalBytes: progress?.totalBytes ?? 0,
      engine,
      snapshot: { registry, engine },
    };
  }, [registry, engine]);
}
