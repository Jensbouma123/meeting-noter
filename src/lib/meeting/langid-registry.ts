import { downloadHfFileResumable, takeBlobUrlBytes } from '@/lib/asr/browser/resumable-download';
import { registerModel, registerDownloadHandler, type AsrBackend } from '@/lib/asr/browser';
import {
  LANGID_MODEL_REPO,
  LANGID_MODEL_REVISION,
  LANGID_MODEL_FILES,
  LANGID_MODEL_FALLBACK_SIZE_BYTES,
} from '@/lib/langid/manifest';

export const LANGID_REGISTRY_KEY = 'langid-whisper-tiny';

let downloadHandlerRegistered = false;

async function downloadLangIdFiles(onProgress: Parameters<Parameters<typeof registerDownloadHandler>[1]>[0]): Promise<void> {
  const urls = await Promise.all([
    downloadHfFileResumable(LANGID_MODEL_REPO, LANGID_MODEL_FILES.encoder, LANGID_MODEL_REVISION, {
      onProgress: (p) => onProgress(p),
    }),
    downloadHfFileResumable(LANGID_MODEL_REPO, LANGID_MODEL_FILES.decoder, LANGID_MODEL_REVISION, {
      onProgress: (p) => onProgress(p),
    }),
  ]);
  for (const url of urls) {
    takeBlobUrlBytes(url);
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

export function registerLangIdModel(backend: AsrBackend): void {
  if (!downloadHandlerRegistered) {
    registerDownloadHandler('langid', downloadLangIdFiles);
    downloadHandlerRegistered = true;
  }

  registerModel({
    key: LANGID_REGISTRY_KEY,
    modelRepo: LANGID_MODEL_REPO,
    displayName: 'Language detection',
    estimatedSizeBytes: LANGID_MODEL_FALLBACK_SIZE_BYTES,
    description:
      'Detects which language is being spoken, run entirely on your device. Optional — ' +
      'transcripts work without it. Downloaded once and cached in your browser.',
    preCheckCache: true,
    backend,
    kind: 'langid',
  });
}
