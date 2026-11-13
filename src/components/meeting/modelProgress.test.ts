import { describe, expect, it } from 'vitest';
import { deriveModelProgress } from './modelProgress';
import { NO_MODEL_PROGRESS } from './modelProgress.constants';
import { asrProgress, downloading, entry } from './modelReadiness.testUtils';

describe('deriveModelProgress', () => {
  it('reports the speech model download, from the registry entry, not the engine', () => {
    const progress = deriveModelProgress([downloading(42)], asrProgress('downloading'));
    expect(progress).toEqual({
      stage: 'downloading',
      percent: 42,
      label: 'Downloading model 42%',
      detail: null,
    });
  });

  it('is indeterminate — not 0% — when the download has no measurable total', () => {
    const noTotal = downloading(0);
    noTotal.progress.totalBytes = 0;
    noTotal.progress.loadedBytes = 0;
    const progress = deriveModelProgress([noTotal], asrProgress('downloading'));
    expect(progress.percent).toBeNull();
    expect(progress.label).toBe('Downloading model');
  });

  it('passes the initialization percentage through with its own wording', () => {
    const progress = deriveModelProgress(
      [entry({ key: 'parakeet-ttd' })],
      asrProgress('loading', { stage: 'initializing', percent: 60 })
    );
    expect(progress).toEqual({
      stage: 'initializing',
      percent: 60,
      label: 'Initializing model 60%',
      detail: null,
    });
  });

  it('keeps the sub-stage detail when initialization has no number to show', () => {
    const progress = deriveModelProgress(
      [entry({ key: 'parakeet-ttd' })],
      asrProgress('loading', {
        stage: 'initializing',
        percent: null,
        detail: '2/4 files',
      })
    );
    expect(progress.percent).toBeNull();
    expect(progress.label).toBe('Initializing model');
    expect(progress.detail).toBe('2/4 files');
  });

  it('is 100% only when ready, and shows nothing else afterwards', () => {
    const ready = deriveModelProgress([entry({ key: 'parakeet-ttd' })], asrProgress('ready'));
    expect(ready.percent).toBe(100);
    expect(ready.stage).toBeNull();
    expect(ready.label).toBe('');

    for (const phase of ['idle', 'blocked', 'failed', 'disabled'] as const) {
      expect(deriveModelProgress([entry({ key: 'parakeet-ttd' })], asrProgress(phase, { enabled: false }))).toBe(
        NO_MODEL_PROGRESS
      );
    }
  });

  it('drops a stale download percentage the moment the entry is cached again', () => {
    const progress = deriveModelProgress(
      [entry({ key: 'parakeet-ttd' })],
      asrProgress('loading', { stage: 'initializing', percent: 35 })
    );
    expect(progress.percent).toBe(35);
    expect(progress.label).toBe('Initializing model 35%');
  });
});
