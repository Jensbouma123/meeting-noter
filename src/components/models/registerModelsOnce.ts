import {
  initRegistry,
  registerDefaultModels,
  autoResumeConsentedDownloads,
  detectAsrBackend,
} from '@/lib/asr/browser';
import { registerDiarizationModel } from '@/lib/meeting/diarization-registry';
import { fetchSpeakerEmbedderIfModelCached } from '@/lib/meeting/diarization-embedder-fetch';
import { registerLangIdModel } from '@/lib/meeting/langid-registry';
import { registerSearchModel } from '@/lib/semantic-search/model-registry';

let registration: Promise<void> | null = null;

async function registerModels(): Promise<void> {
  const backend = await detectAsrBackend();
  initRegistry();
  registerDefaultModels(backend);
  registerDiarizationModel(backend);
  registerLangIdModel(backend);
  registerSearchModel();
  autoResumeConsentedDownloads();
  fetchSpeakerEmbedderIfModelCached();
}

export function registerModelsOnce(): Promise<void> {
  registration ??= registerModels().catch((err: unknown) => {
    registration = null;
    throw err;
  });
  return registration;
}

export function resetModelRegistrationForTests(): void {
  registration = null;
}
