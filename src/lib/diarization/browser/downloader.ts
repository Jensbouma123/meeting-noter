import {
  areModelFilesCached,
  downloadHfFileResumable,
  ensureHfFileCached,
  takeBlobUrlBytes,
  type DownloadProgress,
} from '../../asr/browser/resumable-download';
import { DIARIZATION_MODELS } from './manifest';
import type { DiarizationModelFile } from './types';

export type { DownloadProgress } from '../../asr/browser/resumable-download';

export async function downloadDiarizationModels(
  onProgress?: (file: DiarizationModelFile, progress: DownloadProgress) => void,
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const file of DIARIZATION_MODELS) {
    urls[file.filename] = await downloadHfFileResumable(file.repo, file.filename, 'main', {
      onProgress: (p) => onProgress?.(file, p),
    });
  }
  return urls;
}

export function revokeModelUrls(urls: Record<string, string | undefined>): void {
  for (const url of Object.values(urls)) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      takeBlobUrlBytes(url);
      URL.revokeObjectURL(url);
    }
  }
}

export function modelSource(url: string): string | Uint8Array {
  return takeBlobUrlBytes(url) ?? url;
}

export async function ensureDiarizationModelsCached(
  onProgress?: (file: DiarizationModelFile, progress: DownloadProgress) => void,
): Promise<void> {
  for (const file of DIARIZATION_MODELS) {
    await ensureHfFileCached(file.repo, file.filename, 'main', {
      onProgress: (p) => onProgress?.(file, p),
    });
  }
}

export async function assertDiarizationModelsCached(): Promise<void> {
  for (const file of DIARIZATION_MODELS) {
    const state = await areModelFilesCached({ modelRepo: file.repo, files: [file.filename] });
    if (!state.complete) {
      throw new Error(`Speaker detection model is not downloaded (${file.filename})`);
    }
  }
}
