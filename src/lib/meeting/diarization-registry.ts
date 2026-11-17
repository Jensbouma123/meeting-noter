import { registerModel, registerDownloadHandler, type AsrBackend } from '@/lib/asr/browser';
import { ensureDiarizationModelsCached } from '@/lib/diarization/browser/downloader';
import { DIARIZATION_MODELS, DIARIZATION_TOTAL_SIZE_BYTES, SPEAKER_EMBEDDER } from '@/lib/diarization/browser/manifest';

import { fetchSpeakerEmbedderBestEffort } from './diarization-embedder-fetch';
import { DIARIZATION_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';

export { DIARIZATION_REGISTRY_KEY };

export const DIARIZATION_REGISTRY_IDENTITY = DIARIZATION_MODELS.map((f) => `${f.repo}:${f.filename}`).join('+');

registerDownloadHandler('diarization', async (onProgress) => {
  await ensureDiarizationModelsCached((_file, p) => onProgress(p));
  await fetchSpeakerEmbedderBestEffort((p) => onProgress(p));
});

export function registerDiarizationModel(backend: AsrBackend): void {
  registerModel({
    key: DIARIZATION_REGISTRY_KEY,
    modelRepo: DIARIZATION_REGISTRY_IDENTITY,
    displayName: 'Speaker detection',
    estimatedSizeBytes: DIARIZATION_TOTAL_SIZE_BYTES + SPEAKER_EMBEDDER.sizeBytes,
    description:
      'Identifies who is speaking, run entirely on your device. Optional — transcripts work ' +
      'without it, just without speaker labels. Includes a small voice model that tidies up ' +
      'speakers after the meeting. Downloaded once and cached in your browser.',
    preCheckCache: true,
    backend,
    kind: 'diarization',
  });
}
