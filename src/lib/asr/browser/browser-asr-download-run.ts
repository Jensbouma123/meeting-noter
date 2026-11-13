import {
  downloadParakeetModelResumable,
  isDownloadCancelled,
  type ModelDownloadProgress,
} from './resumable-download';
import * as registry from './model-registry';
import type { ModelEntry } from './model-registry';
import { describeDownloadError } from './browser-asr-download-error';
import { manifestForEntry } from './browser-asr-download-sizes';
import { currentAttempts, downloadHandlers } from './browser-asr-download-state';

function cumulativeProgressReporter(key: string, total: number, isCurrent: () => boolean) {
  const loadedByFile = new Map<string, number>();
  let prevLoaded = 0;
  let prevTime = Date.now();

  return (p: ModelDownloadProgress) => {
    if (!isCurrent()) return;
    loadedByFile.set(p.file, Math.max(loadedByFile.get(p.file) ?? 0, p.loaded));
    let loaded = 0;
    for (const bytes of loadedByFile.values()) loaded += bytes;

    const now = Date.now();
    const dt = (now - prevTime) / 1000;
    const delta = loaded - prevLoaded;
    const throughput = dt > 0 && !p.resuming ? Math.max(0, delta / dt) : 0;
    const timeRem = throughput > 0 ? Math.max(0, (total - loaded) / throughput) : 0;

    registry.updateProgress(key, loaded, total, p.file, throughput, timeRem, p.resuming);

    prevLoaded = loaded;
    prevTime = now;
  };
}

export async function downloadEntryFiles(key: string, entry: ModelEntry): Promise<void> {
  const attempt = {};
  currentAttempts.set(key, attempt);
  const isCurrent = () => currentAttempts.get(key) === attempt;

  const total = entry.estimatedSizeBytes;
  registry.markDownloading(key, total);

  const cacheWarnings: string[] = [];
  const onProgress = cumulativeProgressReporter(key, total, isCurrent);

  try {
    const kind = entry.kind ?? 'asr';
    if (kind === 'asr') {
      await downloadParakeetModelResumable(manifestForEntry(entry), onProgress, (message) =>
        cacheWarnings.push(message),
      );
    } else {
      const handler = downloadHandlers.get(kind);
      if (!handler) {
        throw new Error(`No download handler registered for model kind "${kind}" (key "${key}")`);
      }
      await handler(onProgress);
    }
    if (!isCurrent()) return;
    if (cacheWarnings.length > 0) {
      registry.markNotCached(key, cacheWarnings[cacheWarnings.length - 1]);
      return;
    }
    registry.updateProgress(key, total, total, '', 0, 0);
    registry.markCached(key);
  } catch (err) {
    if (!isCurrent()) throw err;
    if (isDownloadCancelled(err)) {
      registry.markCancelled(key);
      throw err;
    }
    registry.markFailed(key, describeDownloadError(err));
    throw err;
  } finally {
    if (isCurrent()) currentAttempts.delete(key);
  }
}
