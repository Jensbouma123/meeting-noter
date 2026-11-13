import { emptyInitProgress, type BrowserASRLoadProgress, type InitProgress } from '@/lib/asr/browser';
import type { FetchProgress } from '../types/asr-state';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';

function setInitProgress(next: InitProgress): void {
  const current = asrState.initProgress;
  if (
    next.filesDone === current.filesDone &&
    next.filesTotal === current.filesTotal &&
    next.sessionsCreated === current.sessionsCreated &&
    next.warmedUp === current.warmedUp
  ) {
    return;
  }
  asrState.initProgress = next;
  notifyBrowserListeners();
}

function setFetchProgress(next: FetchProgress): void {
  const prev = asrState.fetchProgress;
  if (
    prev &&
    prev.file === next.file &&
    next.totalBytes > 0 &&
    Math.abs(next.loadedBytes - prev.loadedBytes) < next.totalBytes / 100
  ) {
    return;
  }
  if (prev && prev.file === next.file && prev.loadedBytes === next.loadedBytes) return;
  asrState.fetchProgress = next;
  notifyBrowserListeners();
}

export function onLoadProgress(progress: BrowserASRLoadProgress): void {
  const current = asrState.initProgress;
  switch (progress.stage) {
    case 'files':
      setInitProgress({ ...current, filesDone: progress.done, filesTotal: progress.total });
      return;
    case 'fetch':
      setFetchProgress({
        loadedBytes: progress.loadedBytes ?? 0,
        totalBytes: progress.totalBytes ?? 0,
        file: progress.file ?? '',
      });
      return;
    case 'session':
      setInitProgress({ ...current, sessionsCreated: true });
      return;
    case 'warmup':
      setInitProgress({ ...current, warmedUp: true });
      return;
  }
}

export function clearInitProgress(): void {
  asrState.initProgress = emptyInitProgress();
  asrState.fetchProgress = null;
}
