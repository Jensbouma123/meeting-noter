/** Aggregated speech-model download readiness, derived from the models registry. */
import {
  downloadProgressPercent,
  formatModelProgressLabel,
  type ModelEntry,
  type ModelProgressStage,
} from '@/lib/asr/browser';
import type { BrowserASRPhase } from '@/lib/asr/browser/types';

export type ModelReadiness = 'not-downloaded' | 'downloading' | 'loading' | 'ready' | 'failed';

/** The engine's own runtime state, as the UI sees it (see `browser-asr.ts`). */
export interface AsrRuntimeState {
  /** Whether the engine is switched on at all. */
  enabled: boolean;
  /** What it is doing right now. */
  phase: BrowserASRPhase;
}

/** The engine's progress snapshot (see `getBrowserASRProgress()`). */
export interface AsrRuntimeProgress extends AsrRuntimeState {
  /** 0-100, or `null` when the current stage can't be measured. */
  percent: number | null;
  stage: ModelProgressStage | null;
  /** Sub-stage detail, e.g. "2/4 files". */
  detail: string | null;
}

/** What the UI renders for a preparing model. */
export interface ModelProgressView {
  /** Which half of preparation this is; `null` when it isn't preparing. */
  stage: ModelProgressStage | null;
  /** 0-100, `null` = indeterminate (render a bar without a fill). */
  percent: number | null;
  /** "Downloading model 42%" — empty unless a stage is set. */
  label: string;
  /** Extra sub-stage text, only when `percent` is `null`. */
  detail: string | null;
}

/** Nothing to show: not preparing. Shared, frozen, never reallocated. */
export const NO_MODEL_PROGRESS: ModelProgressView = Object.freeze({
  stage: null,
  percent: null,
  label: '',
  detail: null,
});

/**
 * The one speech-model entry that gates recording — the Parakeet ASR model
 * itself. Entries registered with another `kind` (`'diarization'`, `'langid'`
 * — see `model-registry.ts`) are optional extras: a failed speaker-detection
 * download must not disable the Record button, because transcription works
 * perfectly well without it. Deriving readiness from *all* entries (as this
 * used to) meant one optional model going wrong left the user with a Record
 * button that never enabled and no explanation of which model was at fault.
 */
export function asrModelEntry(entries: ModelEntry[]): ModelEntry | undefined {
  return entries.find((e) => (e.kind ?? 'asr') === 'asr');
}

/**
 * Reduce the registry + engine state to the single value the UI branches on.
 *
 * Note what this deliberately does *not* do: a `blocked` engine whose model
 * is not on disk (not downloaded / not consented) is reported as
 * `'not-downloaded'`, because from the user's side the remedy is identical —
 * download the model — and the detailed reason is carried separately by
 * `getBrowserASRStatusMessage()`.
 */
export function deriveModelReadiness(
  entries: ModelEntry[],
  asr: AsrRuntimeState,
): ModelReadiness {
  const entry = asrModelEntry(entries);
  // Registry not registered yet (backend detection still in flight) — treat as
  // "not downloaded" so the UI offers the download rather than sitting on a
  // clickable Record that would silently transcribe nothing.
  if (!entry) return 'not-downloaded';

  if (entry.status === 'failed' || entry.status === 'unavailable') return 'failed';
  if (entry.status === 'downloading') return 'downloading';
  if (entry.status !== 'cached') return 'not-downloaded';

  // Files are cached — the ONNX session still has to exist before a
  // recording produces a transcript, so "ready" has to mean the engine really
  // is ready, not merely that its bytes are on disk.
  if (asr.enabled) {
    if (asr.phase === 'failed') return 'failed';
    // With the files cached, `blocked` can only be the crash-loop guard
    // (`didPreviousModelLoadCrash()`): every other blocked reason is set on a
    // path that only runs for a model that is *not* on disk. That guard reads
    // any load this tab did not see settle as a crash, including one a reload
    // interrupted, and it only stops *automatic* loads — Record is the
    // explicit retry it expects. Reporting `not-downloaded` here sent the user
    // to a Download that does nothing for a cached model, and disabled the
    // Record that would have cleared the guard, for as long as the tab lived.
    if (asr.phase === 'blocked') return 'ready';
    // Recording is available on a device that transcribes after Stop: the
    // model is on disk, nothing is being prepared right now, and the audio is
    // captured either way. Gating Record on a *live* engine here would make
    // the whole app unusable on exactly the machines that need the CPU model
    // most — the session would never be loadable and therefore never
    // recordable, so the post-stop transcript could never exist.
    if (asr.phase === 'post-stop') return 'ready';
    if (asr.phase !== 'ready') return 'loading';
  }
  return 'ready';
}

/**
 * The percentage to show while the model is getting ready.
 *
 * Two sources, on purpose. The *download* percentage is recomputed from the
 * registry entries rather than read from the engine snapshot, because the
 * entries are what re-render this component on every byte that lands — the
 * engine is not notified per chunk, and must not be (see the notification
 * discipline in `browser-asr.ts`). The *initialization* percentage has no
 * registry equivalent (ORT reports nothing), so it comes from the engine
 * snapshot, which does change as its real stages complete.
 *
 * `percent: 100` is returned only for `ready` — that is the "Ready, then hide"
 * signal every one of these surfaces keys off.
 */
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
  // `post-stop` is not model *preparation*: nothing is loading and nothing is
  // downloading, so there is no preparation percentage to show. The job that
  // does have a percentage — transcribing the finished recording — reports it
  // through its own store (see `post-stop-transcription.ts`), which the
  // transcript surface renders. Showing a preparation bar here would claim
  // progress that is not happening.
  return NO_MODEL_PROGRESS;
}
