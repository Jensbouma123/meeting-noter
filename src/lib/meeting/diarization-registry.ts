import {
  registerModel,
  registerDownloadHandler,
  type AsrBackend,
} from '@/lib/asr/browser';
import { ensureDiarizationModelsCached } from '@/lib/diarization/browser/downloader';
import {
  DIARIZATION_MODEL_REPO,
  DIARIZATION_MODELS,
  DIARIZATION_TOTAL_SIZE_BYTES,
} from '@/lib/diarization/browser/manifest';

export const DIARIZATION_REGISTRY_KEY = 'diarization-turns';

export const DIARIZATION_REGISTRY_IDENTITY = `${DIARIZATION_MODEL_REPO}:${DIARIZATION_MODELS.map((f) => f.filename).join('+')}`;

let downloadHandlerRegistered = false;

export function registerDiarizationModel(backend: AsrBackend): void {
  if (!downloadHandlerRegistered) {
    registerDownloadHandler('diarization', async (onProgress) => {
      await ensureDiarizationModelsCached((_file, p) => onProgress(p));
    });
    downloadHandlerRegistered = true;
  }

  registerModel({
    key: DIARIZATION_REGISTRY_KEY,
    modelRepo: DIARIZATION_REGISTRY_IDENTITY,
    displayName: 'Speaker detection',
    estimatedSizeBytes: DIARIZATION_TOTAL_SIZE_BYTES,
    description:
      'Identifies who is speaking, run entirely on your device. Optional — transcripts work ' +
      'without it, just without speaker labels. Downloaded once and cached in your browser.',
    preCheckCache: true,
    backend,
    kind: 'diarization',
  });
}
