/**
 * Downloads and reads LiquidAI D1 model files via the shared 16 MiB chunked
 * IndexedDB downloader (`src/lib/asr/browser/resumable-download.ts`),
 * mirroring `src/lib/diarization/browser/downloader.ts`.
 */

import {
  areModelFilesCached,
  downloadHfFileResumable,
  ensureHfFileCached,
  takeBlobUrlBytes,
  type DownloadProgress,
} from '../asr/browser/resumable-download';
import { D1_OMNI_REVISION, D1_TEXT_FILES, type D1ModelFile } from './manifest';

export type { DownloadProgress } from '../asr/browser/resumable-download';

/** Download or reuse every D1 text-only file from IndexedDB, returning `blob:` URLs keyed by filename. */
export async function downloadD1Models(
  onProgress?: (file: D1ModelFile, progress: DownloadProgress) => void,
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const file of D1_TEXT_FILES) {
    urls[file.filename] = await downloadHfFileResumable(file.repo, file.filename, D1_OMNI_REVISION, {
      onProgress: (p) => onProgress?.(file, p),
    });
  }
  return urls;
}

/**
 * Release every `blob:` URL returned by `downloadD1Models()` and drop any
 * un-taken byte buffers held by the downloader so weights are not double-pinned.
 */
export function revokeModelUrls(urls: Record<string, string | undefined>): void {
  for (const url of Object.values(urls)) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      takeBlobUrlBytes(url);
      URL.revokeObjectURL(url);
    }
  }
}

/** Take raw bytes behind a `blob:` URL from `downloadD1Models()` before `revokeModelUrls()`. */
export function modelSource(url: string): string | Uint8Array {
  return takeBlobUrlBytes(url) ?? url;
}

/** Read and parse a JSON file from `downloadD1Models()` via cached bytes without double-buffering. */
export async function readModelJson<T = unknown>(url: string): Promise<T> {
  const bytes = takeBlobUrlBytes(url);
  if (bytes) {
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to read D1 JSON (${response.status} ${response.statusText})`);
  }
  return (await response.json()) as T;
}

/** Warm the IndexedDB cache for all D1 files without constructing Blob URLs. */
export async function ensureD1ModelsCached(
  onProgress?: (file: D1ModelFile, progress: DownloadProgress) => void,
): Promise<void> {
  for (const file of D1_TEXT_FILES) {
    await ensureHfFileCached(file.repo, file.filename, D1_OMNI_REVISION, {
      onProgress: (p) => onProgress?.(file, p),
    });
  }
}

/** Throw unless every D1 text-only file is already cached in IndexedDB. */
export async function assertD1ModelsCached(): Promise<void> {
  for (const file of D1_TEXT_FILES) {
    const state = await areModelFilesCached({ modelRepo: file.repo, files: [file.filename] });
    if (!state.complete) {
      throw new Error(`LiquidAI D1 model is not downloaded (${file.filename})`);
    }
  }
}
