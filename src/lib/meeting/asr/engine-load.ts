import type { AsrEngine, AsrModelManifest } from '@/lib/asr/browser';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { clearLoadFailure, recordFailure, setBlockedReason } from './state-updates';
import { clearLoadMarker, markLoadInProgress } from './load-marker';
import { clearInitProgress } from './progress-update';
import { describeLoadFailure } from './load-failure';
import { createEngine } from './engine-create';

export async function loadEngine(
  modelRepo: string | undefined,
  manifest: AsrModelManifest,
): Promise<AsrEngine | null> {
  if (asrState.engine?.isReady) return asrState.engine;

  setBlockedReason(null);
  asrState.previousLoadCrashed = false;
  markLoadInProgress();
  clearInitProgress();
  asrState.loading = true;
  notifyBrowserListeners();

  try {
    const engine = await createEngine(modelRepo, manifest);
    if (engine !== null) clearLoadFailure();
    asrState.ready = engine !== null;
    asrState.loading = false;
    clearLoadMarker();
    notifyBrowserListeners();
    return engine;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[asr] Speech model failed to load', err);
    recordFailure('load', describeLoadFailure(message));
    asrState.loading = false;
    asrState.engine = null;
    clearLoadMarker();
    notifyBrowserListeners();
    return null;
  }
}
