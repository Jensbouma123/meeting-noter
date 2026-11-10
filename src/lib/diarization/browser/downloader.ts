/** Downloads the diarization model files, reusing the ASR module's resumable
 *  Hugging Face downloader (import only — see `AGENTS.md` ownership split;
 *  `src/lib/asr/**` itself is owned by another worker).
 *
 * Same benefits as the ASR download path: HTTP Range resume across refresh,
 * cross-tab dedup, and byte-count/hash validation before anything is cached
 * — see `resumable-download.ts`'s own module doc for why a plain
 * single-`fetch` download isn't good enough for a page that gets refreshed
 * mid-download.
 */

import {
  areModelFilesCached,
  downloadHfFileResumable,
  ensureHfFileCached,
  takeBlobUrlBytes,
  type DownloadProgress,
} from '../../asr/browser/resumable-download';
import { DIARIZATION_MODELS, type DiarizationModelFile } from './manifest';

export type { DownloadProgress } from '../../asr/browser/resumable-download';

/**
 * Download every diarization model file (resumable, cached in IndexedDB via
 * the shared downloader), returning a `blob:` URL per file keyed by
 * filename — suitable to hand straight to `onnxruntime-web`'s
 * `InferenceSession.create(url)` (see `onnx-session.ts`).
 */
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

/**
 * Release the `blob:` URLs `downloadDiarizationModels()` handed out.
 *
 * A live object URL pins its Blob, so forgetting these leaves a second full
 * copy of every model file resident for the rest of the page's life — on top
 * of the copy ONNX Runtime already made inside the session. For a ~73 MB
 * model that is survivable on its own; in a tab also holding a 670 MB speech
 * model it is the difference between "loads" and "the WebContent process gets
 * killed and Safari reloads the page".
 *
 * Only `blob:` URLs are revoked — anything else isn't ours to release, and
 * `revokeObjectURL` on one is a no-op anyway.
 */
export function revokeModelUrls(urls: Record<string, string | undefined>): void {
  for (const url of Object.values(urls)) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      // The downloader also keeps the bytes behind each URL until they are
      // taken; revoking the URL alone left that copy pinned.
      takeBlobUrlBytes(url);
      URL.revokeObjectURL(url);
    }
  }
}

/** The model bytes behind a URL from `downloadDiarizationModels()`, for
 *  `InferenceSession.create`, or the URL itself when the downloader holds no
 *  bytes for it. Take this before `revokeModelUrls`, which drops the bytes. */
export function modelSource(url: string): string | Uint8Array {
  return takeBlobUrlBytes(url) ?? url;
}

/**
 * Warm the cache for every diarization file without keeping any bytes: the
 * registry's download handler only needs the files on disk, and
 * `downloadHfFileResumable` would build a full-size Blob per file just to have
 * it revoked.
 */
export async function ensureDiarizationModelsCached(
  onProgress?: (file: DiarizationModelFile, progress: DownloadProgress) => void,
): Promise<void> {
  for (const file of DIARIZATION_MODELS) {
    await ensureHfFileCached(file.repo, file.filename, 'main', {
      onProgress: (p) => onProgress?.(file, p),
    });
  }
}

/**
 * Throw unless every model file is already cached. The worker calls this
 * before loading so an evicted cache fails loudly instead of re-downloading
 * ~73 MB outside the consent/progress UI (the registry owns downloads).
 */
export async function assertDiarizationModelsCached(): Promise<void> {
  for (const file of DIARIZATION_MODELS) {
    const state = await areModelFilesCached({ modelRepo: file.repo, files: [file.filename] });
    if (!state.complete) {
      throw new Error(`Speaker detection model is not downloaded (${file.filename})`);
    }
  }
}
