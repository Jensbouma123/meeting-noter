import type * as ort from 'onnxruntime-web';
import { downloadHfFileResumable, takeBlobUrlBytes } from '@/lib/asr/browser/resumable-download';
import { LANGID_MODEL_REPO, LANGID_MODEL_REVISION, LANGID_MODEL_FILES } from './manifest';
import { ensureOrtConfigured } from './ort-config';
import { createSession, revokeBlobUrls } from './ort-session';
import type { DownloadProgressHandler, LangIdModel } from './types';

function downloadModelFile(file: string, onProgress?: DownloadProgressHandler): Promise<string> {
  return downloadHfFileResumable(LANGID_MODEL_REPO, file, LANGID_MODEL_REVISION, {
    onProgress: (p) => onProgress?.(p.loaded, p.total, p.file),
  });
}

async function createWebGpuModel(encoderModel: string | Uint8Array, decoderModel: string | Uint8Array): Promise<LangIdModel | null> {
  const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  if (!hasWebGpu) return null;
  let encoder: ort.InferenceSession | undefined;
  try {
    encoder = await createSession(encoderModel, 'webgpu');
    const decoder = await createSession(decoderModel, 'webgpu');
    return { encoder, decoder, backend: 'webgpu' };
  } catch {
    await encoder?.release().catch(() => {});
    return null;
  }
}

export async function loadLangIdModel(onProgress?: DownloadProgressHandler): Promise<LangIdModel> {
  ensureOrtConfigured();

  const encoderUrl = await downloadModelFile(LANGID_MODEL_FILES.encoder, onProgress);
  const decoderUrl = await downloadModelFile(LANGID_MODEL_FILES.decoder, onProgress);

  const encoderModel = takeBlobUrlBytes(encoderUrl) ?? encoderUrl;
  const decoderModel = takeBlobUrlBytes(decoderUrl) ?? decoderUrl;

  try {
    const webGpuModel = await createWebGpuModel(encoderModel, decoderModel);
    if (webGpuModel) return webGpuModel;

    const encoder = await createSession(encoderModel, 'wasm');
    const decoder = await createSession(decoderModel, 'wasm');
    return { encoder, decoder, backend: 'wasm' };
  } finally {
    revokeBlobUrls([encoderUrl, decoderUrl]);
  }
}
