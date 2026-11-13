import {
  downloadProgressPercent,
  formatModelProgressLabel,
  type ModelEntry,
} from '@/lib/asr/browser';
import { asrModelEntry } from './modelEntries';
import { NO_MODEL_PROGRESS } from './modelProgress.constants';
import type { AsrRuntimeProgress, ModelProgressView } from './modelReadiness.types';

export function deriveModelProgress(
  entries: ModelEntry[],
  asr: AsrRuntimeProgress,
): ModelProgressView {
  if (asr.phase === 'ready') {
    return { stage: null, percent: 100, label: '', detail: null };
  }
  if (asr.phase === 'downloading') {
    const entry = asrModelEntry(entries);
    const percent = downloadProgressPercent(
      entry?.status === 'downloading' ? entry.progress : null,
    );
    return {
      stage: 'downloading',
      percent,
      label: formatModelProgressLabel('downloading', percent),
      detail: percent === null && entry?.progress.resuming ? 'Resuming download' : null,
    };
  }
  if (asr.phase === 'loading') {
    return {
      stage: 'initializing',
      percent: asr.percent,
      label: formatModelProgressLabel('initializing', asr.percent),
      detail: asr.detail,
    };
  }
  return NO_MODEL_PROGRESS;
}
