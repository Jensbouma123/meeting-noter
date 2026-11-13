import type { LeadContext } from '../types/download-lead';
import { blobUrlFor } from './blob-url';
import { createCacheFailureTracker } from './cache-failure-tracker';
import {
  activeDownloadAborters,
  activeDownloadReaders,
  downloadCancelError,
  wasCancelRequested,
} from './download-cancellation';
import { openChannel } from './download-lock';
import { transferFile } from './file-transfer';
import { resolveFileUrl } from './hf-repo-meta';
import { isSizeValid } from './resume-decision';
import { createStallGuard } from './stall-guard';

export async function leadDownload(ctx: LeadContext): Promise<string | null> {
  const { repoId, filename, revision, key, meta, wantBytes, onProgress, abortGeneration } = ctx;
  const url = ctx.urlOverride ?? resolveFileUrl(repoId, filename, revision);
  const channel = openChannel();
  const failures = createCacheFailureTracker(filename);

  const aborter = new AbortController();
  activeDownloadAborters.add(aborter);
  const guard = createStallGuard(filename, aborter, abortGeneration);

  let transfer;
  try {
    transfer = await transferFile({
      url,
      filename,
      key,
      meta,
      wantBytes,
      guard,
      aborter,
      channel,
      onProgress,
      onWriteFailure: failures.onWriteFailure,
    });
  } finally {
    guard.clear();
    activeDownloadAborters.delete(aborter);
    const reader = guard.currentReader();
    if (reader) activeDownloadReaders.delete(reader);
    channel?.close();
  }
  const { writer, totalBytes, resuming, verifyHash } = transfer;

  guard.throwIfStopped();

  if (!isSizeValid(writer.loaded, totalBytes)) {
    throw new Error(
      `Failed to download ${filename}: got ${writer.loaded} bytes, expected ${totalBytes} — refusing to cache a short file (${url})`,
    );
  }

  if (verifyHash && meta?.sha256) {
    const hex = writer.checksum();
    if (hex !== meta.sha256) {
      if (resuming) {
        console.warn(
          `[resumable-download] Resumed "${filename}" (${revision}) did not match its checksum; ` +
            'discarding the partial download and fetching it again from the start.',
        );
        await writer.reset();
        return leadDownload(ctx);
      }
      throw new Error(
        `Failed to download ${filename}: checksum mismatch — refusing to cache a corrupt file. ` +
          `A from-scratch download that does not match means the bytes were corrupted in ` +
          `transit, or "${revision}" moved while it was being fetched (${url})`,
      );
    }
  }

  if (wasCancelRequested(aborter, abortGeneration)) {
    throw downloadCancelError(filename);
  }
  await writer.commit();

  if (failures.count() > 0) {
    ctx.onCacheWarning?.(
      `The model downloaded, but this browser could not store it (${failures.count()} cache ` +
        'write(s) failed). It will be downloaded again the next time it is needed.',
    );
  }

  if (!wantBytes) return null;
  const fileUrl = blobUrlFor(writer.completeParts());
  writer.release();
  return fileUrl;
}
