import type { StallGuard } from '../types/download-stall';
import { DOWNLOAD_STALL_MS } from './constants';
import { downloadCancelError, wasCancelRequested } from './download-cancellation';
import { describeDownloadStall, unrefTimer } from './timing';

export function createStallGuard(
  filename: string,
  aborter: AbortController,
  abortGeneration: number,
): StallGuard {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let stallFired = false;

  const clear = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  const arm = () => {
    clear();
    stallTimer = setTimeout(() => {
      stallFired = true;
      if (reader) reader.cancel().catch(() => {});
      try {
        aborter.abort();
      } catch {
        return;
      }
    }, DOWNLOAD_STALL_MS);
    unrefTimer(stallTimer);
  };

  const throwIfStopped = () => {
    if (wasCancelRequested(aborter, abortGeneration)) {
      throw downloadCancelError(filename);
    }
    if (stallFired || aborter.signal.aborted) {
      throw new Error(describeDownloadStall(filename, DOWNLOAD_STALL_MS));
    }
  };

  const rethrowStopped = (err: unknown): never => {
    throwIfStopped();
    throw err;
  };

  return {
    arm,
    clear,
    setReader: (r) => {
      reader = r;
    },
    currentReader: () => reader,
    throwIfStopped,
    rethrowStopped,
  };
}
