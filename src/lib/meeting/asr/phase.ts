import { getModelStatus, type BrowserASRPhase } from '@/lib/asr/browser';
import { CRASHED_LOAD_MESSAGE, PARQUET_REGISTRY_KEY, POST_STOP_MESSAGE } from './constants';
import { asrState } from './state';
import { isPostStopTranscriptionOnly } from './backend';

export function getBrowserASRPhase(): BrowserASRPhase {
  if (!asrState.enabled) return 'disabled';
  if (asrState.previousLoadCrashed) return 'blocked';
  if (asrState.failed) return 'failed';
  if (asrState.ready) return 'ready';
  const entry = getModelStatus(PARQUET_REGISTRY_KEY);
  if (entry) {
    if (entry.status === 'downloading') return 'downloading';
    if (entry.status === 'failed' || entry.status === 'cancelled' || entry.status === 'unavailable') {
      return 'failed';
    }
  }
  if (asrState.loading) return 'loading';
  if (asrState.blockedReason) return 'blocked';
  if (isPostStopTranscriptionOnly()) return 'post-stop';
  return 'idle';
}

export function getBrowserASRStatusMessage(): string | null {
  if (asrState.previousLoadCrashed) return CRASHED_LOAD_MESSAGE;
  switch (getBrowserASRPhase()) {
    case 'blocked':
      return asrState.blockedReason;
    case 'failed':
      return asrState.error ?? getModelStatus(PARQUET_REGISTRY_KEY)?.error ?? null;
    case 'post-stop':
      return POST_STOP_MESSAGE;
    case 'ready':
      return isPostStopTranscriptionOnly() ? POST_STOP_MESSAGE : null;
    default:
      return null;
  }
}
