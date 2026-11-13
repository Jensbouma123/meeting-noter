import type { InitProgress, InitStage, ModelProgressStage } from './types/model-progress';

export type { InitProgress, InitStage, ModelProgressStage } from './types/model-progress';

export function emptyInitProgress(): InitProgress {
  return { filesDone: 0, filesTotal: 0, sessionsCreated: false, warmedUp: false };
}

export const INIT_STAGE_WEIGHTS: Readonly<Record<InitStage, number>> = Object.freeze({
  files: 0.35,
  session: 0.45,
  warmup: 0.2,
});

export const INIT_STAGE_LABELS: Readonly<Record<InitStage, string>> = Object.freeze({
  files: 'Reading model files',
  session: 'Creating the model session',
  warmup: 'Warming up the model',
});

export function formatModelProgressLabel(stage: ModelProgressStage, percent: number | null): string {
  const subject = stage === 'downloading' ? 'Downloading model' : 'Initializing model';
  return percent === null ? subject : `${subject} ${percent}%`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampToNotReady(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(99, Math.round(percent)));
}

export function downloadProgressPercent(
  progress: { loadedBytes: number; totalBytes: number; resuming?: boolean } | null | undefined,
): number | null {
  if (!progress) return null;
  if (progress.resuming) return null;
  if (!Number.isFinite(progress.totalBytes) || progress.totalBytes <= 0) return null;
  if (!Number.isFinite(progress.loadedBytes)) return null;
  return clampToNotReady((progress.loadedBytes / progress.totalBytes) * 100);
}

export function currentInitStage(progress: InitProgress): InitStage | null {
  if (progress.warmedUp) return null;
  if (progress.sessionsCreated) return 'warmup';
  if (progress.filesTotal > 0 && progress.filesDone < progress.filesTotal) return 'files';
  return 'session';
}

export function describeInitStage(progress: InitProgress): string | null {
  const stage = currentInitStage(progress);
  if (!stage) return null;
  if (stage === 'files' && progress.filesTotal > 0) {
    return `${Math.min(progress.filesDone, progress.filesTotal)}/${progress.filesTotal} files`;
  }
  return INIT_STAGE_LABELS[stage];
}

export function initProgressPercent(
  progress: InitProgress,
  weights: Readonly<Record<InitStage, number>> = INIT_STAGE_WEIGHTS,
): number | null {
  if (progress.sessionsCreated && progress.warmedUp) return 100;

  const sessionAndWarmup =
    weights.session * (progress.sessionsCreated ? 1 : 0) +
    weights.warmup * (progress.warmedUp ? 1 : 0);

  if (progress.filesTotal <= 0) {
    if (progress.sessionsCreated) return clampToNotReady((sessionAndWarmup) * 100);
    return null;
  }

  const filesFraction = clamp01(progress.filesDone / progress.filesTotal);
  return clampToNotReady((weights.files * filesFraction + sessionAndWarmup) * 100);
}
