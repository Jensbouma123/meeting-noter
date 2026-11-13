import type { ModelEntry } from '@/lib/asr/browser';
import type { AsrRuntimeProgress, AsrRuntimeState } from './modelReadiness.types';

export function entry(overrides: Partial<ModelEntry> & { key: string }): ModelEntry {
  return {
    modelRepo: 'repo',
    displayName: 'Model',
    estimatedSizeBytes: 1,
    backend: 'wasm',
    status: 'cached',
    progress: {
      loadedBytes: 1,
      totalBytes: 1,
      currentFile: '',
      throughputBytesPerSec: 0,
      etaSeconds: 0,
      percent: 100,
    },
    error: null,
    wasCancelled: false,
    isReady: true,
    ...overrides,
  } as ModelEntry;
}

export const asr = (phase: AsrRuntimeState['phase'], enabled = true): AsrRuntimeState => ({
  enabled,
  phase,
});

export const asrProgress = (
  phase: AsrRuntimeProgress['phase'],
  overrides: Partial<AsrRuntimeProgress> = {},
): AsrRuntimeProgress => ({
  enabled: true,
  phase,
  percent: null,
  stage: null,
  detail: null,
  ...overrides,
});

export const downloading = (percent: number): ModelEntry =>
  entry({
    key: 'parakeet-ttd',
    status: 'downloading',
    isReady: false,
    progress: {
      loadedBytes: percent * 10,
      totalBytes: 1000,
      currentFile: 'encoder-model.onnx.data',
      throughputBytesPerSec: 0,
      etaSeconds: 0,
      percent,
    },
  });
