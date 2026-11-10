/** Model-preparation progress — the pure arithmetic behind the percentages
 *  the UI shows while the speech model is getting ready.
 *
 * Getting the model ready has two halves that need very different treatment,
 * and conflating them is what made "press Record and watch nothing happen for
 * forty seconds" indistinguishable from "it's broken":
 *
 * 1. **Download** — real bytes. The registry already tracks
 *    `loadedBytes`/`totalBytes` across *all* the model's files
 *    (`ModelProgress`, see `model-registry.ts`), so this half is a straight
 *    ratio. Nothing is estimated.
 * 2. **Initialization** — `parakeet.js` → ONNX Runtime Web. ORT exposes no
 *    progress API at all, so there is nothing to read and *no honest way to
 *    interpolate a percentage between two awaits*. A smooth 0→100 timer here
 *    would be fiction: it would tick happily through a session that is about
 *    to fail with "WebAssembly.Memory initial page count is too large" and
 *    then show the failure at 97%.
 *
 *    So initialization is measured in **stages that really completed**, and
 *    each stage is worth a fixed slice of the bar. Every number this module
 *    produces is a completed-real-thing count, never a guess about elapsed
 *    time. A stage that cannot be measured (see `currentInitStage` /
 *    `initProgressPercent`) yields `null` — an indeterminate bar with the
 *    stage's name — instead of a made-up percentage.
 *
 * `100` is reserved for `ready`: the bar is "progress *toward* a usable
 * model", so it never sits at 100% while the engine is still loading
 * (see `clampToNotReady`).
 */

/** Which half of model preparation a percentage describes. */
export type ModelProgressStage = 'downloading' | 'initializing';

/**
 * The real, measured sub-stages of initialization, in the order they happen.
 *
 * - `files` — the model's files are being read out of the IndexedDB cache
 *   the load will read them from. Per-file and genuinely countable, because
 *   the manifest lists the files (`AsrModelManifest.files`).
 * - `session` — ORT has created the inference session(s). `parakeet.js`
 *   `fromUrls` resolves only once every session exists, so this is a real
 *   all-or-nothing signal, not a per-file one.
 * - `warmup` — one real inference over a second of silence has run. This is
 *   not a fake "kick off the timers" step: it is the first genuine
 *   encoder/decoder pass, run up front so the user's first captured frame
 *   doesn't pay for kernel compilation.
 */
export type InitStage = 'files' | 'session' | 'warmup';

export interface InitProgress {
  /** Manifest files already read out of the cache. */
  filesDone: number;
  /** How many files the manifest lists (`0` = unknown/unmeasured). */
  filesTotal: number;
  /** `fromUrls` resolved — every ONNX session exists. */
  sessionsCreated: boolean;
  /** The warm-up inference completed. */
  warmedUp: boolean;
}

/** A zeroed `InitProgress` — what the state is before a load starts. */
export function emptyInitProgress(): InitProgress {
  return { filesDone: 0, filesTotal: 0, sessionsCreated: false, warmedUp: false };
}

/**
 * How much of the bar each initialization stage is worth. Sums to 1.
 *
 * The weights are deliberately not equal, and not derived from timings: an
 * earlier version of this measured stage durations and turned them into
 * weights, which just encoded "session creation is usually the slow bit" as
 * if it were a law. The split below is a statement about what the user
 * perceives — file reads are quick, session creation is the part that has
 * historically failed or hung, the warm-up is a short but real inference —
 * and nothing more.
 */
export const INIT_STAGE_WEIGHTS: Readonly<Record<InitStage, number>> = Object.freeze({
  files: 0.35,
  session: 0.45,
  warmup: 0.2,
});

/** User-facing name of each stage, used when no percentage is available. */
export const INIT_STAGE_LABELS: Readonly<Record<InitStage, string>> = Object.freeze({
  files: 'Reading model files',
  session: 'Creating the model session',
  warmup: 'Warming up the model',
});

/** Human label for the whole stage: "Downloading model 42%". */
export function formatModelProgressLabel(stage: ModelProgressStage, percent: number | null): string {
  const subject = stage === 'downloading' ? 'Downloading model' : 'Initializing model';
  return percent === null ? subject : `${subject} ${percent}%`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Clamp a computed percentage to 0-99.
 *
 * 100% is `ready` and nothing else. `updateProgress()` in the registry
 * genuinely reports 100 when the last byte lands, and `_doDownload` then has
 * to resolve `markCached` + session creation before the model is usable — so
 * a bar that reads "100%" while the engine is still initializing is a
 * promise the app can't keep. The last percent of the bar is therefore only
 * reachable by actually being ready.
 */
function clampToNotReady(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(99, Math.round(percent)));
}

/** The download's real byte ratio, or `null` when it isn't measurable yet. */
export function downloadProgressPercent(
  progress: { loadedBytes: number; totalBytes: number; resuming?: boolean } | null | undefined,
): number | null {
  if (!progress) return null;
  // Mid-resume the loaded count is real but the connection isn't flowing
  // yet, so the bar would sit frozen at a number that isn't going to move.
  // Indeterminate plus the "Resuming download" line the caller renders from
  // `ModelProgress.resuming` is the honest state.
  if (progress.resuming) return null;
  if (!Number.isFinite(progress.totalBytes) || progress.totalBytes <= 0) return null;
  if (!Number.isFinite(progress.loadedBytes)) return null;
  return clampToNotReady((progress.loadedBytes / progress.totalBytes) * 100);
}

/**
 * Which initialization stage is running right now, or `null` when they are
 * all done.
 *
 * `filesTotal === 0` means the file list was never known, so the file stage
 * can't be counted and the stage is reported as `session` (which is also
 * what is really happening: the files are being read one at a time).
 */
export function currentInitStage(progress: InitProgress): InitStage | null {
  if (progress.warmedUp) return null;
  if (progress.sessionsCreated) return 'warmup';
  if (progress.filesTotal > 0 && progress.filesDone < progress.filesTotal) return 'files';
  return 'session';
}

/** Extra, sub-stage detail for the UI — e.g. "3/4 files". */
export function describeInitStage(progress: InitProgress): string | null {
  const stage = currentInitStage(progress);
  if (!stage) return null;
  if (stage === 'files' && progress.filesTotal > 0) {
    return `${Math.min(progress.filesDone, progress.filesTotal)}/${progress.filesTotal} files`;
  }
  return INIT_STAGE_LABELS[stage];
}

/**
 * Initialization progress as a percentage of the way to `ready`, from
 * completed stages only.
 *
 * Returns `null` — indeterminate — when the file stage is in flight but
 * uncountable, because any number for it would be invented. Everything else
 * is a weighted sum of real, finished work.
 */
export function initProgressPercent(
  progress: InitProgress,
  weights: Readonly<Record<InitStage, number>> = INIT_STAGE_WEIGHTS,
): number | null {
  if (progress.sessionsCreated && progress.warmedUp) return 100;

  const sessionAndWarmup =
    weights.session * (progress.sessionsCreated ? 1 : 0) +
    weights.warmup * (progress.warmedUp ? 1 : 0);

  if (progress.filesTotal <= 0) {
    // The file-read stage is unmeasured. Once the session exists we can still
    // report the remainder honestly; before that, there is nothing to anchor
    // a number to.
    if (progress.sessionsCreated) return clampToNotReady((sessionAndWarmup) * 100);
    return null;
  }

  const filesFraction = clamp01(progress.filesDone / progress.filesTotal);
  return clampToNotReady((weights.files * filesFraction + sessionAndWarmup) * 100);
}
