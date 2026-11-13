import { DOWNLOAD_CANCEL_REASON } from './constants';

export const activeDownloadAborters = new Set<AbortController>();
export const activeDownloadReaders = new Set<ReadableStreamDefaultReader<Uint8Array>>();
export const activeFollowerCancels = new Set<() => void>();

let downloadAbortGeneration = 0;

export function currentAbortGeneration(): number {
  return downloadAbortGeneration;
}

export function abortInFlightDownloads(): void {
  downloadAbortGeneration += 1;
  for (const cancel of [...activeFollowerCancels]) {
    try {
      cancel();
    } catch {
      continue;
    }
  }
  for (const reader of [...activeDownloadReaders]) {
    try {
      reader.cancel(DOWNLOAD_CANCEL_REASON).catch(() => {});
    } catch {
      continue;
    }
  }
  for (const aborter of [...activeDownloadAborters]) {
    try {
      aborter.abort(DOWNLOAD_CANCEL_REASON);
    } catch {
      continue;
    }
  }
}

export function wasCancelRequested(aborter: AbortController, generation: number): boolean {
  return aborter.signal.reason === DOWNLOAD_CANCEL_REASON || downloadAbortGeneration !== generation;
}

export function downloadCancelError(filename: string): Error {
  return new DOMException(`Download of ${filename} cancelled.`, 'AbortError') as unknown as Error;
}

export function isDownloadCancelled(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}
