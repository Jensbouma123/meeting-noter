import type { BroadcastMsg } from '../types/download-lead';
import type { DownloadFileOptions } from '../types/download-progress';
import { blobUrlFor } from './blob-url';
import { cacheKey, readCachedFile } from './cached-files';
import { CACHED_META_DEADLINE_MS } from './constants';
import { currentAbortGeneration, downloadCancelError } from './download-cancellation';
import { openChannel, withDownloadLock } from './download-lock';
import { followDownload } from './follow-download';
import { getRepoFileMeta, headFileMeta } from './hf-repo-meta';
import { leadDownload } from './lead-download';
import { isSizeValid } from './resume-decision';
import { settleWithin } from './timing';

export async function acquireHfFile(
  repoId: string,
  filename: string,
  revision: string,
  options: DownloadFileOptions,
  wantBytes: boolean,
): Promise<string | null> {
  const { onProgress } = options;
  const key = cacheKey(repoId, revision, filename);
  const abortGeneration = currentAbortGeneration();
  const channel = openChannel();

  try {
    return await withDownloadLock(key, async (isLeader) => {
      const lookupMeta = async () =>
        (await getRepoFileMeta(repoId, revision, filename)) ??
        (options.urlOverride ? await headFileMeta(options.urlOverride).catch(() => null) : null);
      const cached = await readCachedFile(key).catch(() => null);
      const meta = cached
        ? await settleWithin(lookupMeta(), CACHED_META_DEADLINE_MS)
        : await lookupMeta();
      if (cached && (!meta || isSizeValid(cached.record.size, meta.size))) {
        const total = meta?.size ?? cached.record.size;
        onProgress?.({ loaded: total, total, file: filename, resuming: false });
        return wantBytes ? blobUrlFor(cached.parts) : null;
      }

      if (currentAbortGeneration() !== abortGeneration) {
        throw downloadCancelError(filename);
      }

      if (!isLeader) {
        return await followDownload(key, channel, filename, wantBytes, onProgress);
      }

      try {
        const fileUrl = await leadDownload({
          repoId,
          filename,
          revision,
          key,
          meta,
          wantBytes,
          onProgress,
          onCacheWarning: options.onCacheWarning,
          urlOverride: options.urlOverride,
          abortGeneration,
        });
        channel?.postMessage({ type: 'done', key } satisfies BroadcastMsg);
        return fileUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        channel?.postMessage({ type: 'failed', key, message } satisfies BroadcastMsg);
        throw err;
      }
    });
  } finally {
    channel?.close();
  }
}
