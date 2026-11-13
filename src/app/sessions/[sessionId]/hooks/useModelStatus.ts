import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  subscribeRegistry,
  getState as getModelRegistryState,
  getServerSnapshot as getModelRegistryServerSnapshot,
} from '@/components/models';
import {
  getBrowserASRProgress,
  getServerBrowserASRProgress,
  enableBrowserASR,
  subscribeBrowserASR,
  warmBrowserASR,
  getPostStopTranscriptionProgress,
  getServerPostStopProgress,
  subscribePostStopTranscription,
} from '@/lib/meeting';
import { deriveModelProgress } from '@/components/meeting/modelProgress';
import { deriveModelReadiness } from '@/components/meeting/modelReadiness';
import type { BrowserASRPhase } from '@/lib/asr/browser/types';

export function useModelStatus() {
  const modelRegistryState = useSyncExternalStore(
    subscribeRegistry,
    getModelRegistryState,
    getModelRegistryServerSnapshot
  );
  const modelEntries = useMemo(
    () => Object.values(modelRegistryState.entries),
    [modelRegistryState]
  );
  const browserASR = useSyncExternalStore(
    subscribeBrowserASR,
    getBrowserASRProgress,
    getServerBrowserASRProgress
  );
  const asrEnabled = browserASR.enabled;
  const asrPhase: BrowserASRPhase = browserASR.phase;

  const postStop = useSyncExternalStore(
    subscribePostStopTranscription,
    getPostStopTranscriptionProgress,
    getServerPostStopProgress
  );

  const modelReadiness = useMemo(
    () => deriveModelReadiness(modelEntries, { enabled: asrEnabled, phase: asrPhase }),
    [modelEntries, asrEnabled, asrPhase]
  );
  const modelProgress = useMemo(
    () => deriveModelProgress(modelEntries, browserASR),
    [modelEntries, browserASR]
  );

  useEffect(() => {
    enableBrowserASR();
  }, []);

  useEffect(() => {
    if (modelReadiness === 'loading' || (asrEnabled && modelEntries.every((e) => e.status === 'cached'))) {
      warmBrowserASR();
    }
  }, [modelReadiness, asrEnabled, modelEntries]);

  return {
    modelReadiness,
    modelProgress,
    modelReady: modelReadiness === 'ready',
    asrEnabled,
    asrPhase,
    postStop,
  };
}
