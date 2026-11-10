/** Model download registry — module-level observable store.
 *
 * Tracks per-model download state (not downloaded / downloading / cached /
 * failed / cancelled / unavailable), persistence of consent choice, and
 * real-time download progress.  Uses module-level state (no zustand) with
 * the same subscribe / getState pattern as the rest of meeting-noter.
 *
 * Never reads localStorage or sessionStorage during render — persisted values
 * are read inside mount effects (React useSyncExternalStore or useEffect).
 */

import {
  hubOptionsFor,
  type AsrBackend,
  type AsrModelManifest,
  type ManifestRuntimeOptions,
} from './model-manifest';
import { activeAsrManifest } from './backend-detect';

export type { AsrBackend } from './model-manifest';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Download lifecycle states for a single model entry. */
export type ModelStatus =
  | 'not-downloaded'
  | 'downloading'
  | 'cached'
  | 'failed'
  | 'cancelled'
  | 'unavailable';

/** Real-time progress reported by the resumable downloader as bytes arrive. */
export interface ModelProgress {
  /** Bytes downloaded so far (cumulative across all files). */
  loadedBytes: number;
  /** Total bytes across all files to download. */
  totalBytes: number;
  /** The file the bytes currently arriving belong to. */
  currentFile: string;
  /** Estimated throughput in bytes/s (derived). */
  throughputBytesPerSec: number;
  /** Time remaining in seconds (derived), 0 when unknown. */
  etaSeconds: number;
  /** Overall percent 0..100 (derived). */
  percent: number;
  /**
   * True while a resumed download is still doing setup (checking what was
   * already saved, re-establishing the connection) before real bytes are
   * flowing again — the UI shows "Resuming…" instead of a percentage while
   * this is true. Optional so every existing `ModelProgress` literal stays
   * valid; absent/undefined reads as `false`.
   */
  resuming?: boolean;
}

/** Persistent metadata for a single downloadable model entry. */
export interface ModelEntryConfig {
  /** Unique registry key (e.g. "parakeet-ttd"). */
  key: string;
  /** HuggingFace repo ID the files are fetched from. */
  modelRepo: string;
  /** Display name shown in the consent dialog. */
  displayName: string;
  /** Approximate total download size in bytes (for dialog). */
  estimatedSizeBytes: number;
  /** Additional description for the consent dialog. */
  description?: string;
  /**
   * The manifest's runtime options (quantization, backend, preprocessor).
   *
   * Typed as the manifest's own options rather than a third party's function
   * signature on purpose: the app resolves and loads the model files itself
   * (see `resumable-download.ts`), and a type imported from a package we no
   * longer call is a coupling with no reader.
   */
  fromHubOptions?: ManifestRuntimeOptions;
  /** Whether to pre-check IndexedDB cache before downloading. */
  preCheckCache?: boolean;
  /**
   * Which backend this entry's files/quantisation were chosen for. Part of
   * the entry's identity (see `registerModel`): a persisted entry from a
   * previous session on a different backend is a different set of files, not
   * a resumable version of the same download.
   */
  backend: AsrBackend;
  /**
   * Which variant of that backend — the manifest's own `variant`
   * (`webgpu-q4f16` / `webgpu-fp16` / `wasm-int8`, see `model-manifest.ts`).
   * Also part of the entry's identity, and the reason the two WebGPU variants
   * cannot be confused: they share one `modelRepo` and one `backend`, and
   * differ only in the encoder, so without this a 516 MB q4f16 download would
   * read as a "cached" 1.24 GB fp16 one (or the other way round) — a
   * guaranteed 404 or a session built from the wrong weights, with a
   * believable-looking green "Ready" in front of it. Optional so entries
   * persisted before it existed (and the non-ASR kinds below, which are not
   * parakeet manifests at all) keep parsing.
   */
  variant?: string;
  /**
   * Which download implementation this entry uses — see `_doDownload` in
   * `browser-asr-download-manager.ts`. Defaults to `'asr'` (the Parakeet
   * manifest path) when absent, so entries persisted before this field
   * existed keep working. Any other value downloads through whatever was
   * registered for it via `registerDownloadHandler()` instead of the
   * Parakeet path — e.g. `'diarization'` (`src/lib/diarization/browser/**`)
   * or `'langid'` (`src/lib/langid/**`), each sharing this one registry/
   * consent UI (one download queue, one dialog) without being a
   * `parakeet.js` manifest themselves. Left as a plain string, not a closed
   * union, so a new model kind never needs an edit here to add itself.
   */
  kind?: string;
}

/** Complete model entry including dynamic state. */
export interface ModelEntry extends ModelEntryConfig {
  /** Current download state. */
  status: ModelStatus;
  /** Progress data (only meaningful when downloading). */
  progress: ModelProgress;
  /** Error message when status === 'failed'. */
  error: string | null;
  /** Whether a download was explicitly cancelled by the user. */
  wasCancelled: boolean;
  /** Whether any model is ready (cached). */
  isReady: boolean;
}

/** Consent decision persisted for the current browser. */
export type ConsentChoice = 'accepted' | 'declined' | null;

/** Consent state structure for persistence. */
export interface ConsentState {
  /** When the user made their choice (null = never prompted). */
  decidedAt: number | null;
  /** The explicit choice. */
  choice: ConsentChoice;
  /** Keys of models the user agreed to download. */
  acceptedModels: string[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** localStorage key for persisted consent state. */
const CONSENT_STORAGE_KEY = 'mn.model-consent.v1';

/** localStorage key for persisted model entries (cached state). */
const REGISTRY_STORAGE_KEY = 'mn.model-registry.v1';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

/** All model entries, keyed by their registry key. */
let entries: Record<string, ModelEntry> = {};

/**
 * Explicit dialog visibility override.
 * `null` = automatic, see shouldShowDialog().
 */
let dialogVisible: boolean | null = null;

/** Persisted consent state (read lazily, never during render). */
let persistedConsent: ConsentState | null = null;

/** The backend actually selected for this device — see `RegistryState`. */
let activeBackend: AsrBackend | null = null;

const listeners = new Set<() => void>();

/**
 * Copy-on-write update of one entry. Every mutator goes through this so both
 * `getState().entries` and `entries[key]` change identity on each write —
 * memoised consumers (`useMemo(..., [entries])`, selectors on
 * `s.entries[key]`) only see a change when the reference changes.
 */
function patchEntry(key: string, patch: Partial<ModelEntry>): ModelEntry | undefined {
  const entry = entries[key];
  if (!entry) return undefined;
  const next = { ...entry, ...patch };
  entries = { ...entries, [key]: next };
  return next;
}

function emptyProgress(totalBytes: number): ModelProgress {
  return {
    loadedBytes: 0,
    totalBytes,
    currentFile: '',
    throughputBytesPerSec: 0,
    etaSeconds: 0,
    percent: 0,
  };
}

/**
 * `updateProgress` runs once per fetch chunk (tens of thousands of times for a
 * multi-gigabyte model), so it notifies at most every `PROGRESS_NOTIFY_MS` and
 * writes localStorage at most every `PROGRESS_PERSIST_MS`. Status transitions
 * (`mark*`) always notify and persist, which also flushes the latest progress.
 */
const PROGRESS_NOTIFY_MS = 250;
const PROGRESS_PERSIST_MS = 3_000;
let lastProgressNotifyAt = 0;
let lastProgressPersistAt = 0;
let pendingProgressNotify: ReturnType<typeof setTimeout> | null = null;

/** Called by `recordConsent('declined')` so the download manager can abort. */
const declineListeners = new Set<() => void>();

/**
 * Register a callback run when the user declines consent. The download manager
 * uses it to abort in-flight fetches; the registry cannot import the manager
 * directly (the manager imports the registry).
 */
export function onConsentDeclined(fn: () => void): () => void {
  declineListeners.add(fn);
  return () => {
    declineListeners.delete(fn);
  };
}

/* ------------------------------------------------------------------ */
/* Snapshot caching                                                     */
/*                                                                    */
/* useSyncExternalStore compares snapshots with Object.is, so both     */
/* getSnapshot and getServerSnapshot MUST return a stable reference.   */
/* Returning a freshly built object on every call makes React re-render */
/* forever ("The result of getServerSnapshot should be cached to avoid */
/* an infinite loop"). We memoise the client snapshot and invalidate it */
/* whenever the store notifies, and the server snapshot is one frozen   */
/* constant created once at module load.                               */
/* ------------------------------------------------------------------ */

/** Shape returned by both getState() and getServerSnapshot(). */
export interface RegistryState {
  entries: Record<string, ModelEntry>;
  dialogVisible: boolean;
  consentState: ConsentState | null;
  /**
   * The backend actually selected for this device (`null` until detection —
   * see `detectAsrBackend()` — resolves). Surfaced in Settings > Speech model
   * so a WASM fallback is visible rather than silent.
   */
  activeBackend: AsrBackend | null;
}

/**
 * Server-render / hydration snapshot. A single shared frozen reference,
 * created once, so React always sees an identical value.
 */
const SERVER_SNAPSHOT: RegistryState = Object.freeze({
  entries: Object.freeze({}) as Record<string, ModelEntry>,
  dialogVisible: false,
  consentState: Object.freeze({
    decidedAt: null,
    choice: null,
    acceptedModels: Object.freeze([]) as unknown as string[],
  }) as ConsentState,
  activeBackend: null,
});

/** Memoised client snapshot; null means "rebuild on next read". */
let cachedSnapshot: RegistryState | null = null;

export function notifyListeners(): void {
  if (pendingProgressNotify !== null) {
    clearTimeout(pendingProgressNotify);
    pendingProgressNotify = null;
  }
  lastProgressNotifyAt = Date.now();
  cachedSnapshot = null;
  for (const fn of listeners) fn();
}

/* ------------------------------------------------------------------ */
/* Helpers — lazy persistence (never during render)                    */
/* ------------------------------------------------------------------ */

function readPersistedConsent(): ConsentState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function persistConsent(state: ConsentState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore — graceful degradation.
  }
}

function readPersistedEntries(): Record<string, ModelEntry> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: Record<string, Omit<ModelEntry, 'isReady'>> = JSON.parse(raw);
    // Restore isReady computed property
    const result: Record<string, ModelEntry> = {};
    for (const key of Object.keys(parsed)) {
      const entry = parsed[key];
      result[key] = {
        ...entry,
        // No download survives a reload, so a persisted `downloading` is never
        // true. `autoResumeConsentedDownloads()` re-marks the consented ones;
        // the rest would otherwise stay frozen at `downloading` forever.
        status: entry.status === 'downloading' ? 'not-downloaded' : entry.status,
        progress: entry.progress ? { ...entry.progress, resuming: false } : entry.progress,
        isReady: entry.status === 'cached',
      };
    }
    return result;
  } catch {
    return {};
  }
}

function persistEntries(): void {
  lastProgressPersistAt = Date.now();
  try {
    if (typeof localStorage === 'undefined') return;
    const serializable: Record<string, Pick<ModelEntry, Exclude<keyof ModelEntry, 'isReady'>>> = {};
    for (const [key, entry] of Object.entries(entries)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isReady, ...rest } = entry as ModelEntry;
      serializable[key] = rest as Pick<ModelEntry, Exclude<keyof ModelEntry, 'isReady'>>;
    }
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore.
  }
}

/* ------------------------------------------------------------------ */
/* Computed properties                                                 */
/* ------------------------------------------------------------------ */

/**
 * Whether the consent dialog should be shown.
 *
 * `null` = automatic (derive from consent + model status).
 * `true` / `false` = explicit override, set by openDialog()/closeDialog().
 *
 * The automatic rules are:
 *  - never asked yet            -> show
 *  - user chose "Not now"       -> do NOT show again (they said "not now",
 *                                  not "ask me immediately"); re-opening is
 *                                  explicit via openDialog()
 *  - user accepted, still       -> show, so download progress is visible
 *    downloading or missing
 *  - everything cached or
 *    unavailable                -> do not show
 */
function shouldShowDialog(): boolean {
  if (dialogVisible !== null) return dialogVisible;

  if (persistedConsent === null || persistedConsent.decidedAt === null) {
    return true;
  }
  if (persistedConsent.choice === 'declined') {
    return false;
  }
  return !Object.values(entries).every(
    (e) => e.status === 'cached' || e.status === 'unavailable',
  );
}

/* ------------------------------------------------------------------ */
/* API — Registry                                                      */
/* ------------------------------------------------------------------ */

/** Subscribe to registry changes. Returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Read the current registry state snapshot (memoised — stable reference). */
export function getState(): RegistryState {
  if (cachedSnapshot === null) {
    cachedSnapshot = {
      entries,
      dialogVisible: shouldShowDialog(),
      consentState: persistedConsent,
      activeBackend,
    };
  }
  return cachedSnapshot;
}

/** Record which backend was selected (or fallen back to) for this device. */
export function setActiveBackend(backend: AsrBackend): void {
  if (activeBackend === backend) return;
  activeBackend = backend;
  notifyListeners();
}

/**
 * Register a model entry. Returns the entry (mutates registry).
 *
 * A persisted entry (loaded by `initRegistry()` from a previous visit) is
 * only reused when its `modelRepo`, `backend` *and* `variant` still match the
 * manifest passed in here. `modelRepo` guards the case documented below;
 * `backend` guards a newer one: a device that downloaded the WebGPU (fp32)
 * variant in an earlier session but now resolves to WASM (or vice versa — a
 * runtime WebGPU failure forcing WASM for the rest of the session) needs a
 * different file set, not a "still cached" reuse of the old one. `variant`
 * guards the case those two cannot: the q4f16 and fp16 WebGPU encoders are
 * the same repo on the same backend and differ only in the file they fetch.
 *
 * A mismatch re-registers from scratch (`status: 'not-downloaded'`), which is
 * the right outcome for a fallback rung: the new variant genuinely has to be
 * downloaded and re-consented, and the entry that is about to be asked about
 * has to describe the files that are actually about to arrive — including the
 * size, which differs by 723 MB between those two rungs.
 *
 * The `modelRepo` check itself is not incidental: an earlier version of this
 * manifest pointed `parakeet-ttd` at a repo that only shipped an int4
 * encoder, and reusing
 * whatever was in localStorage unconditionally meant that fixing the repo
 * in code never reached a browser that had already persisted the old,
 * broken entry — it kept re-requesting `encoder-model.onnx` from the wrong
 * repo (a 404) forever, with the fix sitting right there in the manifest.
 * Comparing `modelRepo` makes a manifest fix self-healing instead of
 * requiring everyone to clear site data.
 */
export function registerModel(config: ModelEntryConfig): ModelEntry {
  const existing = entries[config.key];
  if (
    existing &&
    existing.modelRepo === config.modelRepo &&
    existing.backend === config.backend &&
    (existing.variant ?? null) === (config.variant ?? null)
  ) {
    return existing;
  }

  const entry: ModelEntry = {
    ...config,
    status: 'not-downloaded',
    progress: emptyProgress(config.estimatedSizeBytes),
    error: null,
    wasCancelled: false,
    isReady: false,
  } as ModelEntry;

  entries = { ...entries, [config.key]: entry };
  notifyListeners();
  persistEntries();
  return entry;
}

/** Set the dialog visibility flag (controlled by provider). */
/** Explicitly show or hide the consent dialog (overrides the automatic rule). */
export function setDialogVisible(visible: boolean): void {
  if (dialogVisible === visible) return;
  dialogVisible = visible;
  notifyListeners();
}

/**
 * Explicitly open the consent dialog, e.g. from the progress chip.
 * Use this to let the user revisit a download they previously skipped.
 */
export function openDialog(): void {
  setDialogVisible(true);
}

/** Close the dialog and return to the automatic visibility rule. */
export function closeDialog(): void {
  dialogVisible = null;
  notifyListeners();
}

/** Mark a model as cached (use when pre-existing cache is detected). */
export function markCached(key: string): void {
  if (!patchEntry(key, { status: 'cached', isReady: true })) return;
  notifyListeners();
  persistEntries();
}

/**
 * Mark a model as *not* on disk any more, and say why.
 *
 * The counterpart to `markCached`, for when the persisted `cached` claim turns
 * out to be false — the browser's storage was cleared or evicted underneath
 * the app. This is not cosmetic: `initiateDownloads()` filters `cached` entries
 * out, so leaving the stale claim in place makes the Download button do
 * nothing at all while every surface insists the model is ready.
 *
 * `reason` goes in `error`, which the row and the dialog already render for a
 * `not-downloaded` entry's explanation.
 */
export function markNotCached(key: string, reason?: string): void {
  const entry = entries[key];
  if (!entry) return;
  patchEntry(key, {
    status: 'not-downloaded',
    isReady: false,
    wasCancelled: false,
    progress: emptyProgress(entry.estimatedSizeBytes),
    // Carried in `error` so the row can still show it; the dialog renders
    // `entry.error` for a `failed` entry, and leaving it set here means a
    // "not downloaded" entry can carry a one-line explanation too.
    error: reason ?? null,
  });
  notifyListeners();
  persistEntries();
}

/** Mark a model as failed with a message. */
export function markFailed(key: string, message: string): void {
  if (!patchEntry(key, { status: 'failed', error: message, isReady: false })) return;
  notifyListeners();
  persistEntries();
}

/** Mark a model as cancelled by the user. */
export function markCancelled(key: string): void {
  if (!patchEntry(key, { status: 'cancelled', wasCancelled: true, isReady: false })) return;
  notifyListeners();
  persistEntries();
}

/**
 * Mark a model as unavailable. WASM is the universal fallback backend (see
 * `manifestForBackend`), so this now only means "this browser can run
 * neither backend" — not merely "no WebGPU".
 */
export function markUnavailable(key: string): void {
  if (!patchEntry(key, {
    status: 'unavailable',
    error: 'Model unavailable in this browser.',
    isReady: false,
  })) return;
  notifyListeners();
  persistEntries();
}

/**
 * Mark a model as downloading and clear any stale error/progress from a
 * previous attempt, so a retry does not flash the old error text and the old
 * (partial) progress bar until the first new progress event.
 */
export function markDownloading(key: string, totalBytes: number): void {
  if (!patchEntry(key, {
    status: 'downloading',
    error: null,
    wasCancelled: false,
    isReady: false,
    progress: { ...emptyProgress(totalBytes), resuming: false },
  })) return;
  notifyListeners();
  persistEntries();
}

/** Update download progress for a model entry (called from download manager). */
export function updateProgress(
  key: string,
  loadedBytes: number,
  totalBytes: number,
  currentFile: string,
  throughputBytesPerSec: number,
  etaSeconds: number,
  resuming = false,
): void {
  if (!patchEntry(key, {
    progress: {
      loadedBytes,
      totalBytes,
      currentFile,
      throughputBytesPerSec,
      etaSeconds,
      percent: totalBytes > 0
        ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100))
        : 0,
      resuming,
    },
  })) return;
  // NOTE: reaching 100% of the *reported* total deliberately does NOT flip the
  // entry to `cached`. The total is a size estimate, and inferring terminal
  // state from it marked a 2.5 GB download complete once it passed the
  // (previously hardcoded, 6x too small) 412 MB estimate — while the encoder
  // was still arriving. Only the download manager, which sees every file
  // actually arrive *and* be stored, sets `cached`.
  const now = Date.now();
  if (now - lastProgressPersistAt >= PROGRESS_PERSIST_MS) persistEntries();
  if (now - lastProgressNotifyAt >= PROGRESS_NOTIFY_MS) {
    notifyListeners();
  } else if (pendingProgressNotify === null) {
    // Trailing notify, so the last progress of a burst is never swallowed.
    // The snapshot is invalidated now so a direct `getState()` read is current.
    cachedSnapshot = null;
    pendingProgressNotify = setTimeout(
      notifyListeners,
      PROGRESS_NOTIFY_MS - (now - lastProgressNotifyAt),
    );
  } else {
    cachedSnapshot = null;
  }
}

/** Replace an entry's size estimate with a measured value (HF tree probe). */
export function setEstimatedSize(key: string, sizeBytes: number): void {
  const entry = entries[key];
  if (!entry || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return;
  patchEntry(key, {
    estimatedSizeBytes: sizeBytes,
    // Keep an in-flight progress bar consistent with the corrected total.
    ...(entry.status === 'downloading'
      ? { progress: { ...entry.progress, totalBytes: sizeBytes } }
      : {}),
  });
  notifyListeners();
  persistEntries();
}

/**
 * Record the user's consent choice.
 *
 * Deliberately does **not** touch dialog visibility. Recording a decision and
 * dismissing the surface that collected it are different things, and coupling
 * them meant the one caller that cares (the consent dialog's Download button)
 * had to immediately re-open the dialog it had just had closed for it —
 * `recordConsent()`; `setDialogVisible(true)`. Anything that got that order
 * wrong, or any future caller that simply recorded consent, silently closed a
 * dialog the user was looking at, which reads as "I pressed Download and
 * nothing happened". Callers that want a dismissal say so themselves
 * (`setDialogVisible(false)` / `closeDialog()`); both existing ones already do.
 */
export function recordConsent(choice: 'accepted' | 'declined', keys: string[]): void {
  persistedConsent = {
    decidedAt: Date.now(),
    choice,
    acceptedModels: choice === 'accepted' ? keys : [],
  };
  persistConsent(persistedConsent);

  // A decline stops what is downloading: marking alone left the fetch
  // running, and its completion flipped the entry to `cached` anyway. Accepted
  // entries are started by the download manager, not here.
  if (choice === 'declined') {
    for (const key of Object.keys(entries)) {
      if (entries[key].status === 'downloading') markCancelled(key);
    }
    for (const fn of declineListeners) fn();
  }

  notifyListeners();
}

/**
 * Forget every model's progress and put them all back to `not-downloaded`,
 * regardless of what they currently claim.
 *
 * `resetConsent()` deliberately leaves `cached` entries alone — declining a
 * download is not the same as saying the files should go away. This is the
 * other operation: "delete what is downloaded". An entry that still claims
 * `cached` after its bytes are gone is the worst state this store can be in,
 * because Record reads as enabled and nothing is transcribed.
 */
export function resetAllEntries(): void {
  for (const [key, entry] of Object.entries(entries)) {
    patchEntry(key, {
      status: entry.status === 'unavailable' ? 'unavailable' : 'not-downloaded',
      error: null,
      wasCancelled: false,
      isReady: false,
      progress: emptyProgress(entry.estimatedSizeBytes),
    });
  }
  notifyListeners();
  persistEntries();
}

/** Check whether consent has been given for a specific model key. */
export function isConsentGiven(key: string): boolean {
  if (persistedConsent === null) return false;
  if (persistedConsent.choice !== 'accepted') return false;
  return persistedConsent.acceptedModels.includes(key);
}

/** Check whether the user was ever prompted (no decision recorded). */
export function hasNeverBeenPrompted(): boolean {
  return persistedConsent === null;
}

/** Reset the consent decision (re-trigger prompt). */
export function resetConsent(): void {
  persistedConsent = null;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Ignore.
  }
  // Reset non-cached entries to not-downloaded.
  for (const [key, entry] of Object.entries(entries)) {
    if (entry.status !== 'cached' && entry.status !== 'unavailable') {
      patchEntry(key, {
        status: 'not-downloaded',
        error: null,
        wasCancelled: false,
        isReady: false,
        progress: emptyProgress(entry.estimatedSizeBytes),
      });
    }
  }
  notifyListeners();
  persistEntries();
}

/** Initialize the registry from persisted state (call once at app startup, inside a useEffect). */
export function initRegistry(): void {
  if (typeof window === 'undefined') return;
  persistedConsent = readPersistedConsent();
  entries = readPersistedEntries();
  // Recompute isReady
  for (const entry of Object.values(entries)) {
    entry.isReady = entry.status === 'cached';
  }
}

/** Subscribe to the registry for useSyncExternalStore. */
export function subscribeRegistry(fn: () => void): () => void {
  return subscribe(fn);
}

/**
 * Export for React useSyncExternalStore (SSR-safe getter).
 * Returns one frozen constant so the reference never changes between calls.
 */
export function getServerSnapshot(): RegistryState {
  return SERVER_SNAPSHOT;
}

/** Get a single model entry by key (returns undefined if not registered). */
export function getModelStatus(key: string): ModelEntry | undefined {
  return entries[key];
}

/**
 * Register the Parakeet model entry for a specific manifest (call once the
 * backend — and any fallback rung — has been detected; see
 * `detectAsrBackend()` / `activeAsrManifest()`).
 *
 * `descriptionOverride` is used for the cases where the entry's normal
 * description isn't the right message: a runtime step down the WebGPU fallback
 * order, or the drop to WASM (see `browser-asr.ts`), where the user needs to
 * know *why* they're being asked to download a model again.
 */
export function registerManifest(
  manifest: AsrModelManifest,
  descriptionOverride?: string,
): ModelEntry {
  return registerModel({
    key: manifest.key,
    variant: manifest.variant,
    modelRepo: manifest.modelRepo,
    displayName: manifest.displayName,
    estimatedSizeBytes: manifest.fallbackSizeBytes,
    description: descriptionOverride ?? manifest.description,
    fromHubOptions: hubOptionsFor(manifest),
    preCheckCache: true,
    backend: manifest.asrBackend,
  });
}

/**
 * Register the default Parakeet model entry for a given backend.
 *
 * Uses the *active* manifest rather than `manifestForBackend(backend)`, so a
 * page session that has already stepped down the WebGPU fallback order
 * registers the rung it is actually on — registering the first one instead
 * would show the user a size and a file for an encoder that just failed.
 */
export function registerDefaultModels(backend: AsrBackend, descriptionOverride?: string): void {
  const manifest = activeAsrManifest(backend);
  setActiveBackend(backend);
  registerManifest(manifest, descriptionOverride);
}
