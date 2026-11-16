import { getModelStatus, isConsentGiven } from '@/lib/asr/browser';
import { ensureSpeakerEmbedderCached, isEmbedderCached } from '@/lib/diarization/browser/downloader';
import { DIARIZATION_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';

let inFlight: Promise<void> | null = null;

export function fetchSpeakerEmbedderBestEffort(): Promise<void> {
  if (!isConsentGiven(DIARIZATION_REGISTRY_KEY)) return Promise.resolve();
  inFlight ??= (async () => {
    try {
      if (await isEmbedderCached()) return;
      await ensureSpeakerEmbedderCached();
    } catch (err) {
      console.warn('[diarization] speaker embedder download failed; will retry on next load', err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function fetchSpeakerEmbedderIfModelCached(): void {
  if (getModelStatus(DIARIZATION_REGISTRY_KEY)?.status === 'cached') void fetchSpeakerEmbedderBestEffort();
}
