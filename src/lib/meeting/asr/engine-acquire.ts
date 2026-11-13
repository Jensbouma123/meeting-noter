import type { AsrEngine } from '@/lib/asr/browser';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { recordFailure } from './state-updates';
import { isPostStopTranscriptionOnly } from './backend';
import { describeLoadFailure } from './load-failure';
import { getBrowserEngine } from './engine-lookup';

export function acquireEngine(): Promise<AsrEngine | null> {
  if (asrState.engine?.isReady) {
    if (!asrState.ready) {
      asrState.ready = true;
      notifyBrowserListeners();
    }
    return Promise.resolve(asrState.engine);
  }
  if (asrState.enginePromise) return asrState.enginePromise;
  asrState.enginePromise = getBrowserEngine()
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[asr] Failed to prepare the speech model', err);
      recordFailure('load', describeLoadFailure(message));
      asrState.loading = false;
      notifyBrowserListeners();
      return null;
    })
    .finally(() => {
      asrState.enginePromise = null;
    });
  return asrState.enginePromise;
}

export function ensureBrowserASRReady(): Promise<boolean> {
  return acquireEngine().then((engine) => engine !== null && engine.isReady);
}

export function warmBrowserASR(): void {
  if (!asrState.enabled || asrState.previousLoadCrashed) return;
  if (asrState.ready || asrState.loading || asrState.failed) return;
  if (isPostStopTranscriptionOnly()) return;
  void ensureBrowserASRReady().catch((err: unknown) => {
    console.error('[asr] Loading the speech model failed', err);
  });
}
