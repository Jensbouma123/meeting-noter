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

import { DIARIZATION_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';

export { DIARIZATION_REGISTRY_KEY };

export const DIARIZATION_REGISTRY_IDENTITY = `${DIARIZATION_MODEL_REPO}:${DIARIZATION_MODELS.map((f) => f.filename).join('+')}`;

registerDownloadHandler('diarization', async (onProgress) => {
  await ensureDiarizationModelsCached((_file, p) => onProgress(p));
});

export function registerDiarizationModel(backend: AsrBackend): void {
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
