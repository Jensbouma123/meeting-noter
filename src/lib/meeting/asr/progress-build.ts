import {
  describeInitStage,
  downloadProgressPercent,
  formatBytes,
  formatModelProgressLabel,
  getModelStatus,
  initProgressPercent,
} from '@/lib/asr/browser';
import type { BrowserASRProgress } from '../types/asr-progress';
import { PARQUET_REGISTRY_KEY } from './constants';
import { asrState } from './state';
import { getBrowserASRPhase } from './phase';

const SERVER_PROGRESS: BrowserASRProgress = Object.freeze({
  enabled: false,
  phase: 'idle',
  stage: null,
  percent: null,
  detail: null,
  label: null,
});

function sameProgress(a: BrowserASRProgress, b: BrowserASRProgress): boolean {
  return (
    a.enabled === b.enabled &&
    a.phase === b.phase &&
    a.stage === b.stage &&
    a.percent === b.percent &&
    a.detail === b.detail &&
    a.label === b.label
  );
}

function describeLoadingDetail(percent: number | null): string | null {
  const fetch = asrState.fetchProgress;
  if (fetch) {
    const { loadedBytes, totalBytes, file } = fetch;
    const count = totalBytes > 0 ? `${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}` : formatBytes(loadedBytes);
    return file ? `Fetching ${file}: ${count}` : `Fetching model files: ${count}`;
  }
  return percent === null ? (describeInitStage(asrState.initProgress) ?? 'Starting the model') : null;
}

function buildProgress(): BrowserASRProgress {
  const phase = getBrowserASRPhase();
  const enabled = asrState.enabled;

  if (phase === 'ready') {
    return { enabled, phase, stage: null, percent: 100, detail: null, label: null };
  }
  if (phase === 'downloading') {
    const progress = getModelStatus(PARQUET_REGISTRY_KEY)?.progress;
    const percent = downloadProgressPercent(progress);
    return {
      enabled,
      phase,
      stage: 'downloading',
      percent,
      detail: progress?.resuming ? 'Resuming download' : null,
      label: formatModelProgressLabel('downloading', percent),
    };
  }
  if (phase === 'loading') {
    const percent = initProgressPercent(asrState.initProgress);
    const shown = percent === 100 ? 99 : percent;
    return {
      enabled,
      phase,
      stage: 'initializing',
      percent: shown,
      detail: describeLoadingDetail(shown),
      label: formatModelProgressLabel('initializing', shown),
    };
  }
  return { enabled, phase, stage: null, percent: null, detail: null, label: null };
}

export function getBrowserASRProgress(): BrowserASRProgress {
  const next = buildProgress();
  const prev = asrState.progressSnapshot;
  if (prev && sameProgress(prev, next)) return prev;
  asrState.progressSnapshot = next;
  return next;
}

export function getServerBrowserASRProgress(): BrowserASRProgress {
  return SERVER_PROGRESS;
}
