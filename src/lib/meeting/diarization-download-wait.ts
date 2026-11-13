import { getModelStatus, subscribeRegistry } from '@/lib/asr/browser';
import { DIARIZATION_REGISTRY_KEY } from './diarization-registry';
import { downloadWait, setDiarizationStatus, waitingSources } from './diarization-session';
import type { Source } from './types';

export function unavailableReason(status: string, error: string | null): string {
  if (status === 'cancelled') return 'The speaker detection download was cancelled — download it in Settings to label speakers.';
  if (status === 'failed') return `The speaker detection download failed${error ? `: ${error}` : ''}.`;
  return 'Speaker detection is not available in this browser.';
}

export function clearWaiting(): void {
  waitingSources.clear();
  downloadWait.stop?.();
  downloadWait.stop = null;
}

export function waitForDownload(sources: readonly Source[], startReady: (ready: readonly Source[]) => void): void {
  for (const source of sources) waitingSources.add(source);
  setDiarizationStatus({ phase: 'waiting', reason: 'Speaker detection starts when its model has downloaded.' });
  if (downloadWait.stop) return;
  downloadWait.stop = subscribeRegistry(() => {
    const entry = getModelStatus(DIARIZATION_REGISTRY_KEY);
    if (entry?.status === 'cached') {
      const ready = [...waitingSources];
      clearWaiting();
      startReady(ready);
    } else if (entry && entry.status !== 'downloading' && entry.status !== 'not-downloaded') {
      clearWaiting();
      setDiarizationStatus({ phase: 'unavailable', reason: unavailableReason(entry.status, entry.error) });
    }
  });
}
