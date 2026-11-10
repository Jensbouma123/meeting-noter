import { describe, expect, it } from 'vitest';
import {
  asrModelEntry,
  deriveModelProgress,
  deriveModelReadiness,
  NO_MODEL_PROGRESS,
  type AsrRuntimeProgress,
  type AsrRuntimeState,
} from './modelReadiness';
import type { ModelEntry } from '@/lib/asr/browser';

/**
 * The UI's single readiness decision — the thing that decides whether Record
 * is enabled and what it says when it isn't. Two failures are pinned here,
 * both of which produced a "click Record, get nothing" experience:
 *
 * - deriving readiness from *all* registry entries, so a failed *optional*
 *   model (speaker detection, language ID) disabled transcription entirely;
 * - reporting 'ready' from cached files alone, without the engine actually
 *   being loaded — which is what let a Record button be clickable while no
 *   transcript could possibly be produced.
 */

function entry(overrides: Partial<ModelEntry> & { key: string }): ModelEntry {
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

const asr = (phase: AsrRuntimeState['phase'], enabled = true): AsrRuntimeState => ({
  enabled,
  phase,
});

/** The engine snapshot shape `getBrowserASRProgress()` hands the UI. */
const asrProgress = (
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

const downloading = (percent: number): ModelEntry =>
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

describe('deriveModelReadiness', () => {
  it('is not-downloaded before the registry has registered anything', () => {
    expect(deriveModelReadiness([], asr('ready'))).toBe('not-downloaded');
  });

  it('is not-downloaded while the speech model is still missing', () => {
    const entries = [entry({ key: 'parakeet-ttd', status: 'not-downloaded', isReady: false })];
    expect(deriveModelReadiness(entries, asr('blocked'))).toBe('not-downloaded');
  });

  it('keeps Record reachable when a cached model is blocked only by the crash guard', () => {
    // Blocked with the files on disk is the crash-loop guard, whose remedy is
    // an explicit load (Record) — never a download of what is already there.
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('blocked'))).toBe('ready');
  });

  it('reports download progress with its own state, not a generic "loading"', () => {
    const entries = [entry({ key: 'parakeet-ttd', status: 'downloading', isReady: false })];
    expect(deriveModelReadiness(entries, asr('downloading'))).toBe('downloading');
  });

  it('is only ready once the engine itself is ready, not merely cached', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('idle'))).toBe('loading');
    expect(deriveModelReadiness(entries, asr('loading'))).toBe('loading');
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
  });

  it('reports a failed engine, and a failed download, as failed', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('failed'))).toBe('failed');
    const failedEntry = [
      entry({ key: 'parakeet-ttd', status: 'failed', isReady: false, error: 'offline' }),
    ];
    expect(deriveModelReadiness(failedEntry, asr('failed'))).toBe('failed');
  });

  it('ignores optional models — a failed speaker-detection download must not block transcription', () => {
    const entries = [
      entry({ key: 'parakeet-ttd' }),
      entry({ key: 'diarization-turns', kind: 'diarization', status: 'failed', isReady: false }),
      entry({ key: 'langid-whisper-tiny', kind: 'langid', status: 'cancelled', isReady: false }),
    ];
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
    // …and they must not masquerade as the speech model either.
    expect(asrModelEntry(entries)?.key).toBe('parakeet-ttd');
  });

  it('ignores a still-downloading optional model rather than reporting "downloading"', () => {
    const entries = [
      entry({ key: 'parakeet-ttd' }),
      entry({ key: 'diarization-turns', kind: 'diarization', status: 'downloading', isReady: false }),
    ];
    expect(deriveModelReadiness(entries, asr('ready'))).toBe('ready');
  });

  it('is ready without an engine only when ASR is switched off entirely', () => {
    const entries = [entry({ key: 'parakeet-ttd' })];
    expect(deriveModelReadiness(entries, asr('disabled', false))).toBe('ready');
  });
});

/**
 * The percentage every one of these surfaces renders. Two things it must get
 * right that a naive "read the registry's `percent`" does not: a *stale* byte
 * count after the download has moved on, and a stage that is real but has no
 * measurable number in it.
 */
describe('deriveModelProgress', () => {
  it('reports the speech model download, from the registry entry, not the engine', () => {
    // The engine snapshot carries no byte progress of its own (it must not be
    // notified per chunk) — the entries are the download's source of truth.
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

    // Every non-preparing state renders as the shared "nothing to show"
    // value, so no surface has to invent its own empty case.
    for (const phase of ['idle', 'blocked', 'failed', 'disabled'] as const) {
      expect(deriveModelProgress([entry({ key: 'parakeet-ttd' })], asrProgress(phase, { enabled: false }))).toBe(
        NO_MODEL_PROGRESS
      );
    }
  });

  it('drops a stale download percentage the moment the entry is cached again', () => {
    // The registry entry is the last thing to update when a download finishes;
    // between the download and the load the old percent must not keep showing.
    const progress = deriveModelProgress(
      [entry({ key: 'parakeet-ttd' })],
      asrProgress('loading', { stage: 'initializing', percent: 35 })
    );
    expect(progress.percent).toBe(35);
    expect(progress.label).toBe('Initializing model 35%');
  });
});
