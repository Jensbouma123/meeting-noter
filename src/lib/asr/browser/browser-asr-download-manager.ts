/** Model download manager — bridges the model registry and the resumable
 * downloader that owns the model cache.
 *
 * When a download is initiated, this manager walks the manifest's files
 * through `resumable-download.ts` with a progress callback that feeds back into
 * the registry. `parakeet.js`'s own loader is not involved: its cache stores
 * each file as one whole-file `Blob`, which is exactly what WebKit refuses to
 * write for a multi-gigabyte model (see `resumable-download.ts`).
 *
 * Integration point: `browser-asr.ts` calls `initiateDownloads()` instead
 * of `ensureLoaded()` on BrowserASREngine.  The dialog shows progress in
 * real time.
 */

import * as registry from './model-registry';
import type { ModelEntry } from './model-registry';
import { manifestForBackend, manifestForVariant, probeModelSize } from './model-manifest';
import { downloadParakeetModelResumable, closeModelCacheConnections, deleteModelCache, abortInFlightDownloads, isDownloadCancelled, type ModelDownloadProgress, type DeleteModelCacheResult } from './resumable-download';

/** The manifest an entry was registered under: by its `variant` (which also
 *  tells Parakeet from Nemotron), else by its `backend` — entries always
 *  carry one (see `model-registry.ts`), so this is never a guess. */
function manifestForEntry(entry: Pick<ModelEntry, 'backend' | 'variant'>) {
  return manifestForVariant(entry.variant) ?? manifestForBackend(entry.backend);
}

/**
 * Download implementations for a non-`'asr'` `entry.kind` (see
 * `model-registry.ts`'s `ModelEntryConfig.kind`), registered by whoever owns
 * that model kind — e.g. `src/lib/meeting/diarization-bridge.ts` for
 * `'diarization'`. Injected rather than imported directly so this module
 * (part of `src/lib/asr/browser/**`) never has to import from a sibling
 * model's package — the whole point of sharing one download queue/consent
 * dialog is not to also share code coupling.
 */
type DownloadHandler = (onProgress: (p: ModelDownloadProgress) => void) => Promise<void>;
const downloadHandlers = new Map<string, DownloadHandler>();

/** Register how to download models of a given `entry.kind`. */
export function registerDownloadHandler(kind: string, handler: DownloadHandler): void {
  downloadHandlers.set(kind, handler);
}

/* ------------------------------------------------------------------ */
/* State — running download state                                      */
/* ------------------------------------------------------------------ */

/** Promises keyed by model key — allows await without re-triggering. */
let downloadPromises: Record<string, Promise<void>> = {};

/**
 * The live attempt per key. `cancelDownloads()` clears it, so an attempt that
 * settles after a cancel (or after a newer attempt for the same key started)
 * sees it is no longer current and writes nothing to the registry — otherwise
 * a finished download overrode the user's "Not now" by marking itself cached.
 */
const currentAttempts = new Map<string, object>();

// A decline recorded anywhere (not only via the dialog's "Not now") aborts.
registry.onConsentDeclined(() => cancelDownloads());

/** In-flight size probes, so concurrent callers share one request. */
const sizeProbes = new Map<string, Promise<void>>();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Format bytes to a human-readable string.
 *
 * The Parakeet encoder is a multi-gigabyte download, so the GiB branch is not
 * hypothetical: rounding 2.5 GB to "2495.5 MiB" is technically true and
 * practically useless to someone deciding whether to accept the download.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}

/** Format seconds to MM:SS. */
export function formatSeconds(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Size probing                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ask HuggingFace how big the model's files actually are, and correct the
 * registry's estimate.
 *
 * This is not cosmetic. The consent dialog states the download size *before*
 * the user commits, and the fallback constant cannot track a repo whose
 * weights are split across a graph plus a multi-gigabyte external `.data`
 * blob. A wrong number here is a wrong number in front of the user.
 */
export async function probeRegisteredModelSizes(): Promise<void> {
  const entries = Object.values(registry.getState().entries);
  await Promise.all(
    entries.map(async (entry) => {
      // Only the Parakeet (ASR) manifest needs a live HF-tree probe — its
      // size varies with an external `.data` blob the fallback constant
      // can't predict. A `'diarization'` entry's size is fixed (two small,
      // unquantized files — see its manifest), so the registered estimate
      // is already exact.
      if ((entry.kind ?? 'asr') !== 'asr') return;
      const manifest = manifestForEntry(entry);
      if (entry.modelRepo !== manifest.modelRepo) return;
      const existing = sizeProbes.get(entry.key);
      if (existing) return existing;

      const probe = probeModelSize(manifest)
        .then((size) => {
          if (size !== null) registry.setEstimatedSize(entry.key, size);
        })
        .catch(() => {
          // Offline or rate-limited — keep the manifest's fallback.
        })
        .finally(() => {
          sizeProbes.delete(entry.key);
        });
      sizeProbes.set(entry.key, probe);
      return probe;
    })
  );
}

/* ------------------------------------------------------------------ */
/* Download lifecycle                                                  */
/* ------------------------------------------------------------------ */

/**
 * Initiate downloads for all un-cached, un-downloaded models.
 * Checks registry consent first — if the user declined, the download
 * is skipped (status set to 'cancelled').  If the user accepted but
 * no download has started, the download begins.
 *
 * Returns a promise that resolves when all requested downloads finish.
 */
export async function initiateDownloads(): Promise<void> {
  // Correct the size estimate first: the progress bar and the remaining-time
  // estimate are both computed against it, so it has to be right before the
  // first byte lands.
  await probeRegisteredModelSizes();

  const entryKeys = Object.keys(registry.getState().entries);

  // Only models the user accepted and that are not already on disk. Callers
  // record consent first (the consent dialog's Download button does).
  const modelsToDownload = entryKeys.filter((key) => {
    const entry = registry.getState().entries[key];
    if (!entry) return false;
    if (entry.status === 'cached' || entry.status === 'unavailable') return false;
    return registry.isConsentGiven(key);
  });

  await Promise.all(modelsToDownload.map((key) => downloadOrJoin(key)));
}

/**
 * Start a download for `key`, or join the one already running. The
 * `.finally` only removes its *own* promise: a download cancelled and
 * restarted leaves a newer promise under the same key, and deleting that one
 * let a third call start a duplicate concurrent download.
 */
function downloadOrJoin(key: string): Promise<void> {
  if (key in downloadPromises) return downloadPromises[key];
  const entry = registry.getState().entries[key];
  if (!entry) return Promise.resolve();
  const downloadPromise: Promise<void> = _doDownload(key, entry).finally(() => {
    if (downloadPromises[key] === downloadPromise) delete downloadPromises[key];
  });
  downloadPromises[key] = downloadPromise;
  return downloadPromise;
}

/**
 * Download a single model by key.  Waits for completion (or existing promise).
 * Returns a promise that resolves when the download is complete.
 */
async function initiateDownloadsFor(key: string): Promise<void> {
  const entry = registry.getState().entries[key];
  if (!entry) return;
  if (entry.status === 'cached' || entry.status === 'unavailable') return;
  await downloadOrJoin(key);
}

/**
 * Call once at app boot (after `registerDefaultModels()`). A model the user
 * already consented to — but that isn't fully cached, including one that
 * was mid-download when the page was last closed or refreshed — resumes on
 * its own. Without this, the only way a download ever restarted was an
 * explicit click, so a refresh mid-download just left the entry frozen in
 * `downloading` state forever, doing nothing.
 *
 * Does not re-show the consent dialog or ask again — consent already on
 * file is exactly what "without re-asking" means here.
 */
export function autoResumeConsentedDownloads(): void {
  if (typeof window === 'undefined') return;
  const entries = registry.getState().entries;
  for (const key of Object.keys(entries)) {
    const entry = entries[key];
    if (!entry) continue;
    if (entry.status === 'cached' || entry.status === 'unavailable') continue;
    if (!registry.isConsentGiven(key)) continue;
    void initiateDownloadsFor(key);
  }
}

/**
 * Cancel all ongoing downloads: abort the in-flight fetches, mark the entries
 * cancelled and forget the attempts. An attempt that settles afterwards is no
 * longer current and leaves the entry alone (see `currentAttempts`), so the
 * `cancelled` a cancel leaves behind is final until a retry.
 */
export function cancelDownloads(): void {
  const keys = Object.keys(downloadPromises);
  if (keys.length > 0) abortInFlightDownloads();
  for (const key of keys) {
    registry.markCancelled(key);
  }
  currentAttempts.clear();
  downloadPromises = {};
}

/**
 * Retry a failed download for a specific model.
 */
export async function retryDownload(key: string): Promise<void> {
  const entry = registry.getState().entries[key];
  if (!entry) return;
  // Already running — a retry joins it rather than starting a duplicate.
  if (key in downloadPromises) {
    await downloadPromises[key];
    return;
  }
  // Reset the entry through the registry so the reset is persisted and
  // subscribers see it before the new download starts.
  registry.markNotCached(key);
  // Only this key: the global `initiateDownloads()` restarted every other
  // unfinished model too, including ones the user had cancelled.
  await initiateDownloadsFor(key);
}

/* ------------------------------------------------------------------ */
/* Internal: actual download logic                                     */
/* ------------------------------------------------------------------ */

/**
 * Download a single model entry's files via the resumable downloader (see
 * `resumable-download.ts`). Progress is fed back into the registry in real
 * time.
 *
 * Not `fromHub()`: that function buffers each file fully in memory, writes it
 * to IndexedDB as a single whole-file `Blob` — the one thing WebKit refuses to
 * store for a multi-gigabyte model — and throws the `blob:` URLs away without
 * revoking them. The resumable downloader streams the same bytes into
 * `ArrayBuffer` chunks, resumes with an HTTP Range request when a download was
 * interrupted, and leaves the URLs to the load path that actually needs them.
 *
 * Deliberately does not construct the ONNX session — that's `BrowserASREngine`'s
 * job (see `resumable-download.ts` for why: constructing it here mislabeled
 * load failures, including the WASM-memory-limit failure this module exists to
 * fix, as download failures).
 */
async function _doDownload(key: string, entry: ModelEntry): Promise<void> {
  const attempt = {};
  currentAttempts.set(key, attempt);
  const isCurrent = () => currentAttempts.get(key) === attempt;

  const total = entry.estimatedSizeBytes;
  registry.markDownloading(key, total);

  /**
   * The downloaders report *per-file* `loaded`, and a model is several files
   * (some fetched in parallel). Summing the latest value per file is what
   * keeps the bar cumulative instead of falling back to ~0% at each file
   * boundary (which also drove throughput and ETA negative).
   */
  const loadedByFile = new Map<string, number>();
  let prevLoaded = 0;
  let prevTime = Date.now();
  /**
   * "The bytes arrived but the cache would not take them" — see the bottom of
   * this function. Collected rather than acted on immediately so the entry
   * gets one coherent final state instead of a download that reports "cached"
   * and then contradicts itself.
   */
  const cacheWarnings: string[] = [];

  const onProgress = (p: ModelDownloadProgress) => {
    if (!isCurrent()) return;
    loadedByFile.set(p.file, Math.max(loadedByFile.get(p.file) ?? 0, p.loaded));
    let loaded = 0;
    for (const bytes of loadedByFile.values()) loaded += bytes;

    const now = Date.now();
    const dt = (now - prevTime) / 1000;
    const delta = loaded - prevLoaded;
    const throughput = dt > 0 && !p.resuming ? Math.max(0, delta / dt) : 0;
    const timeRem = throughput > 0 ? Math.max(0, (total - loaded) / throughput) : 0;

    registry.updateProgress(key, loaded, total, p.file, throughput, timeRem, p.resuming);

    prevLoaded = loaded;
    prevTime = now;
  };

  try {
    const kind = entry.kind ?? 'asr';
    if (kind === 'asr') {
      await downloadParakeetModelResumable(manifestForEntry(entry), onProgress, (message) =>
        cacheWarnings.push(message),
      );
    } else {
      const handler = downloadHandlers.get(kind);
      if (!handler) {
        throw new Error(`No download handler registered for model kind "${kind}" (key "${key}")`);
      }
      await handler(onProgress);
    }
    // Cancelled (or superseded) while the bytes were still arriving: the
    // cancel already set the entry's state, and it is not ours to overwrite.
    if (!isCurrent()) return;
    // Every file arrived, validated by size (and by hash where feasible — see
    // resumable-download.ts) — that is the single trustworthy "everything
    // arrived intact" signal.
    //
    // What it is *not* is proof the bytes are on disk. A browser that refuses
    // to store them (the WebKit whole-Blob write failure, a full quota) leaves
    // the download successful and the model unusable for the next session, and
    // claiming `cached` there is the stale-claim bug in a new costume: the
    // Download button filtered out, Settings saying "Ready", Record enabling
    // and the loader finding nothing. So the claim is only made when the cache
    // actually took the bytes, and the reason is shown when it did not.
    if (cacheWarnings.length > 0) {
      registry.markNotCached(key, cacheWarnings[cacheWarnings.length - 1]);
      return;
    }
    registry.updateProgress(key, total, total, '', 0, 0);
    registry.markCached(key);
  } catch (err) {
    if (!isCurrent()) throw err;
    if (isDownloadCancelled(err)) {
      // Stopped on purpose (Delete downloaded models mid-download, or a
      // second cancel landing first): a retry can leave this state, a
      // failure report cannot.
      registry.markCancelled(key);
      throw err;
    }
    registry.markFailed(key, describeDownloadError(err));
    throw err;
  } finally {
    if (isCurrent()) currentAttempts.delete(key);
  }
}

/**
 * Turn a raw download error into a message a user can act on.
 *
 * A dropped connection surfaces from `fetch` as a bare `TypeError: Failed to
 * fetch` — accurate, but not something a non-technical user can act on. When
 * the browser reports itself offline (or the error shape matches a network
 * failure), say so directly; otherwise keep the underlying message so a real
 * HF/HTTP error (404, rate limit, etc.) is still visible.
 */
function describeDownloadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const looksLikeNetworkFailure =
    err instanceof TypeError && /fetch|network/i.test(message);

  if (isOffline || looksLikeNetworkFailure) {
    return "You're offline — check your connection and try again.";
  }
  return `Download failed: ${message}`;
}

/* ------------------------------------------------------------------ */
/* Model entry management (public API)                                 */
/* ------------------------------------------------------------------ */

/** Get the list of registered model entries. */
export function getRegisteredModels(): registry.ModelEntryConfig[] {
  return Object.values(registry.getState().entries).map((e) => ({
    key: e.key,
    modelRepo: e.modelRepo,
    displayName: e.displayName,
    estimatedSizeBytes: e.estimatedSizeBytes,
    description: e.description,
    fromHubOptions: e.fromHubOptions,
    backend: e.backend,
    kind: e.kind,
  }));
}

/**
 * Delete every downloaded model file and put the registry back to square one.
 *
 * Three things have to happen, in this order, or the app is left lying:
 *
 * 1. Abort the in-flight fetches (`abortInFlightDownloads`), drop the
 *    download bookkeeping (`cancelDownloads`) and close this module's
 *    IndexedDB connections. The close is not politeness: a connection left
 *    open *blocks* the very delete being asked for, which is how a
 *    `deleteDatabase()` in the console came to do nothing at all (see
 *    `resumable-download.ts`). The abort is not optional either: a fetch
 *    that finishes after the delete would write its file back and mark the
 *    entry cached again, un-deleting what was just deleted.
 * 2. Wait for the aborted downloads to settle, *then* delete the cache
 *    database (and any left behind by an older build). Settling first is
 *    what keeps a stale terminal write from landing after the reset below.
 * 3. Reset every entry, cached or not, and clear the consent decision — the
 *    bytes are gone, so a persisted `cached`/`accepted` state is now a lie that
 *    survives a reload.
 *
 * `deleted: false` means another connection (a second tab, most likely) still
 * holds the cache open, so some files are still on disk. The registry is reset
 * either way: a model that is not ready is the state to be in.
 */
export async function deleteDownloadedModels(): Promise<DeleteModelCacheResult> {
  abortInFlightDownloads();
  const inFlight = Object.values(downloadPromises);
  cancelDownloads();
  closeModelCacheConnections();
  if (inFlight.length > 0) await Promise.allSettled(inFlight);
  const result = await deleteModelCache();
  registry.resetAllEntries();
  registry.resetConsent();
  registry.setDialogVisible(false);
  return result;
}

/* ------------------------------------------------------------------ */
/* Format helpers for UI — `formatBytes` / `formatSeconds` are already */
/* exported at their definitions above.                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Re-export registry functions needed by this module                  */
/* ------------------------------------------------------------------ */

export type { ModelEntry, ModelEntryConfig, ModelProgress, ModelStatus } from './model-registry';
export {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  updateProgress,
  setEstimatedSize,
  markFailed,
  markCancelled,
  markCached,
  markUnavailable,
  registerModel,
  notifyListeners,
} from './model-registry';

/* ------------------------------------------------------------------ */
/* Download manager handle (consumed by browser-asr.ts)                */
/* ------------------------------------------------------------------ */

/** Returns a handle to the download manager for a single key. */
export function getBrowserASRDownloadManager() {
  return { initiateDownloadsFor };
}
