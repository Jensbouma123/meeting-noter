/** Browser ASR integration for the meeting module.
 *
 * This is the only transcription engine — there is no server-side fallback
 * (the app is 100% client-side; see AGENTS.md / the removal of the realtime
 * WebSocket sidecar). Provides lazy-loading browser ASR via parakeet.js with
 * automatic backend selection — WebGPU when a working adapter is available,
 * WASM otherwise — and a runtime fallback that walks the whole manifest chain
 * (`asrManifestFallbackOrder()`: q4f16 → fp16 on WebGPU, then WASM/int8) if a
 * session fails to create despite an adapter existing (driver denylist,
 * context loss, out-of-memory). If no backend can load the model, or the user
 * disables browser ASR, transcription simply does not run for this session —
 * see `getBrowserASRPhase()` / `getBrowserASRStatusMessage()`, which is what
 * the UI renders instead of failing silently.
 *
 * THE CPU MODEL IS NOT A LIVE PATH. The WASM/int8 variant measured RTF 1.41 on
 * the §3 bench — 1.41 s of compute per second of audio — so when the chain ends
 * there, this module does not feed it frames: it records the audio
 * (`post-stop-transcription.ts`) and transcribes it after Stop, with a real
 * percentage, and says so while the meeting is running. That is the
 * `post-stop` phase, and it is the only way the CPU model is ever used.
 *
 * Model downloads require explicit user consent (via the model registry).
 * If the user declines, no download starts and no transcription happens
 * until they accept.
 */

import { setOverlapTranscriber, type TimedWord } from './overlap-retranscribe';
import {
  createBrowserASREngine,
  type AsrEngine,
  type BrowserASREvents,
  type BrowserASRLoadProgress,
  type BrowserASRPhase,
  activeAsrManifest,
  configFromManifest,
  detectAsrBackend,
  describeInitStage,
  downloadProgressPercent,
  emptyInitProgress,
  forceWasmBackend,
  forceNextWebgpuEncoder,
  formatBytes,
  formatModelProgressLabel,
  initProgressPercent,
  registerManifest,
  type AsrBackend,
  type AsrModelManifest,
  type InitProgress,
  type ModelProgressStage,
} from '@/lib/asr/browser';
import { webgpuEncoderOf } from '@/lib/asr/browser/model-manifest';
import { getAsrModelFamily, setAsrModelFamily, type AsrModelFamily } from '@/lib/asr/browser/model-family';
import { debugEnabled } from '@/lib/asr/browser/quiet-console';
import { appendPostStopAudio, beginPostStopCapture, clearPostStopCapture, hasBufferedAudio } from './post-stop-buffer';
import { getPostStopProgress, isPostStopTranscriptionRunning } from './post-stop-progress';
import { transcribeRecordedAudio } from './post-stop-transcription';
import type { PostStopProgress } from './types/post-stop';
import { beginLiveFlush, endLiveFlush, updateLiveFlush } from './live-flush-progress';
import { replaceSegmentFamily, upsertSegment } from '@/lib/meeting/store';
import { attributeSpeakers } from '@/lib/meeting/speaker-attribution';
import { publishLiveUpdate } from '@/lib/meeting/speaker-attribution';
import { LiveChunker, type LiveWindowRequest } from '@/lib/asr/live-chunker';
import { CAPTURE_SAMPLE_RATE, int16ToFloat32 } from './pcm';
import type { LowConfSpan, Segment, SegmentWord } from '@/lib/meeting/types';
import type { BrowserSegment, BrowserLanguageInfo } from '@/lib/asr/browser';
import {
  getBrowserASRDownloadManager,
  getModelStatus,
  areModelFilesCached,
  isConsentGiven,
  initRegistry,
  markCached,
  markNotCached,
  registerDefaultModels,
  resetConsent,
  openDialog,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-exported at module level
  subscribeRegistry,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- re-exported at module level
  getServerSnapshot,
} from '@/lib/asr/browser';

/** Registry key for the Parakeet model entry — shared by every backend
 *  variant (see `model-manifest.ts`), so this never changes with the
 *  backend. */
const PARQUET_REGISTRY_KEY = 'parakeet-ttd';

/** Shown when every WebGPU encoder failed to create a session and this device
 *  falls back to the CPU-only (WASM) model — see `_createEngine()`. */
const WASM_FALLBACK_DESCRIPTION =
  'Your browser could not run the fast (WebGPU) version of this model, so this device will use ' +
  'a smaller, CPU-only version instead — a fresh download is needed. It is too slow to transcribe ' +
  'while you talk, so your recording is transcribed after you stop it. Downloaded once and cached ' +
  'in your browser — audio never leaves this machine.';

/** Shown when the previous page load died mid-model-load and the user retries
 *  with the smaller model — see `retryCrashedLoadWithSmallerModel()`. */
const SMALL_MODEL_AFTER_CRASH_DESCRIPTION =
  'The previous model load crashed this tab, so this device will use a smaller, ' +
  'CPU-only version instead — a fresh download is needed. Downloaded once and cached ' +
  'in your browser — audio never leaves this machine.';

/**
 * What the UI says, while a recording is running, on a device that has no
 * usable WebGPU. One sentence, and it is the whole truth of that situation:
 * live transcription does not happen there, and the recording is not lost
 * either — it is transcribed when the user stops it.
 */
export const POST_STOP_MESSAGE =
  'Live transcription is not supported on this device - the recording will be transcribed after you stop';

/* ------------------------------------------------------------------ */
/* Crash-loop guard — a load that kills the tab must not resume itself */
/* ------------------------------------------------------------------ */

/**
 * Marker left while a model load (ONNX session creation) is in flight.
 *
 * A tab the model load kills — Safari's WebContent process dying on the
 * 2.44 GB fp32 encoder — runs no further JavaScript: no `catch`, no
 * `finally`, no error state. The *absence* of cleanup is the only signal
 * that survives, so the load sets this marker first and clears it once the
 * attempt settles (ready or failed). A marker still present at boot means
 * the previous load crashed the tab.
 *
 * `sessionStorage`, deliberately, not `localStorage`: the marker is
 * tab-scoped because the crash was — a kill in one tab must not block loads
 * in another. A same-tab reload (including Safari's automatic "a problem
 * repeatedly occurred" reload) preserves `sessionStorage`, which is exactly
 * the crash loop this guards.
 */
const ASR_LOAD_MARKER_KEY = 'mn.asr-load-in-progress.v1';

/**
 * How old a marker may be and still read as a crash.
 *
 * The crash loop is fast: the kill lands during the load and Safari reloads
 * the tab straight away, so a marker that caused one is minutes old at most.
 * An older one belongs to a page that went away without `pagehide` for some
 * other reason — iOS discarding a background tab, say — and `sessionStorage`
 * outlives that into the tab's next reload. Blocking that reload would be the
 * guard firing on a crash nobody saw.
 */
const LOAD_MARKER_MAX_AGE_MS = 15 * 60 * 1000;

/** Whether this page set the marker that is in storage now. */
let ownsLoadMarker = false;

function readLoadMarker(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const value = sessionStorage.getItem(ASR_LOAD_MARKER_KEY);
    if (value === null) return false;
    const startedAt = Number(value);
    // An unreadable timestamp still reads as a crash: the guard errs toward
    // blocking, because the other error is a reload loop.
    if (Number.isFinite(startedAt) && Date.now() - startedAt > LOAD_MARKER_MAX_AGE_MS) {
      sessionStorage.removeItem(ASR_LOAD_MARKER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function markLoadInProgress(): void {
  ownsLoadMarker = true;
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(ASR_LOAD_MARKER_KEY, String(Date.now()));
  } catch {
    // Best-effort only: without the marker a crash just looks like a first
    // run, which is the pre-guard behaviour, not a new failure.
  }
}

function clearLoadMarker(): void {
  ownsLoadMarker = false;
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(ASR_LOAD_MARKER_KEY);
  } catch {
    // Best-effort only.
  }
}

/**
 * Whether the previous page in this tab died mid-model-load (see above).
 * Read once at module load — a marker appearing later belongs to *this*
 * page's own in-flight load, which `_loadEngine()` owns end to end.
 */
let previousLoadCrashed = false;

/** The message the UI shows for a crashed previous load (see
 *  `getBrowserASRStatusMessage()`). Phrased to name the remedy, not the
 *  allocator: nothing survived the kill to quote. */
const CRASHED_LOAD_MESSAGE =
  'The previous model load crashed the tab before it could finish. ' +
  'Retry with the smaller CPU-only model below — it needs far less memory. ' +
  'Pressing Record instead tries the same model again.';


/**
 * Whether browser ASR is enabled.
 *
 * Defaults to **true**, and that default is load-bearing. This used to be an
 * opt-in flag, and nothing in the app ever flipped it: `enableBrowserASR()`
 * had no caller, so every captured frame was dropped by the pipeline's
 * `getBrowserASREnabled()` check, the model was never even instantiated, and
 * pressing Record recorded audio that was never transcribed — silently, with
 * no error anywhere. ASR is the only transcription engine now, so "off" has
 * to be an explicit choice (`disableBrowserASR()`), never the absence of one.
 */
let browserASREnabled = true;
/** The browser ASR engine instance (lazy-loaded). */
let browserEngine: AsrEngine | null = null;
/** Whether the model is currently loading. */
let browserLoading = false;
export function getBrowserASRLoading(): boolean {
  return browserLoading;
}

/** Whether the model loaded successfully. */
let browserReady = false;
/** Whether the model failed to load. */
let browserFailed = false;
/** Error message from the last failure. */
let browserError: string | null = null;
/**
 * What kind of failure `browserError` describes. A download failure is
 * tracked on the registry entry itself (`status: 'failed'`, `entry.error`)
 * and never mirrored into `browserError` — see `getBrowserEngine()`.
 * Kept as a real field (not inferred from the message text) so nothing has
 * to pattern-match `browserError` to tell the failures apart.
 */
let browserErrorKind: 'load' | 'transcribe' | null = null;

/**
 * Why no engine is coming, whenever the phase is `blocked` (see
 * `getBrowserASRPhase()`). Set by `getBrowserEngine()` on every path that
 * returns null for a reason the user can act on, so the UI can say *what* to
 * do instead of leaving a clickable Record button that quietly records
 * nothing.
 */
let blockedReason: string | null = null;

/** In-flight engine acquisition, shared by every concurrent caller. */
let enginePromise: Promise<AsrEngine | null> | null = null;

/** A transcription is in flight — later frames are dropped until it settles. */
let transcribeInFlight = false;

const browserListeners = new Set<() => void>();

function notifyBrowserListeners(): void {
  for (const fn of browserListeners) fn();
}

/**
 * Quick, synchronous WebGPU *capability* check — `'gpu' in navigator`. This
 * is NOT authoritative: it does not confirm a working adapter exists (see
 * `detectAsrBackend()` in `backend-detect.ts`, which does). Kept only for
 * cheap, non-blocking UI hints; the actual backend/model selection always
 * goes through `detectAsrBackend()`.
 */
export function isWebGPUAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const gpu = (navigator as { gpu?: unknown }).gpu;
  return gpu !== undefined && gpu !== null;
}

/* ------------------------------------------------------------------ */
/* Post-stop transcription — the CPU model's only, and correct, use     */
/* ------------------------------------------------------------------ */

/**
 * The backend this page session resolved to, or `null` before detection has
 * answered.
 *
 * Set by `resolveAsrBackend()` (and by the module-load probe). It exists
 * because the capture pipeline has to decide *per frame* whether to
 * transcribe live or buffer — and it cannot await an adapter probe 10 times a
 * second. `meeting.start()` awaits `resolveAsrBackend()` before the AudioContext
 * opens, so by the time a single frame exists this is never `null`.
 */
let activeBackend: AsrBackend | null = null;

/**
 * Resolve (and register) the backend for this device, awaiting the adapter
 * probe the first time.
 *
 * The capture pipeline calls this once before it starts, so the very first
 * frame already knows whether this device transcribes live. Cheap afterwards:
 * `detectAsrBackend()` memoises the probe, and re-registering an unchanged
 * manifest is a no-op in the registry.
 */
export function resolveAsrBackend(): Promise<AsrBackend> {
  return detectAsrBackend().then((backend) => {
    activeBackend = backend;
    settleRecordingMode();
    registerDefaultModels(backend);
    return backend;
  });
}

/**
 * Whether the capture pipeline should buffer this frame instead of
 * transcribing it live.
 *
 * `activeBackend !== 'webgpu'` — *including* while detection is still
 * unresolved. That is the lossless direction: a frame buffered before the
 * adapter probe answers costs a few hundred KB and is discarded if the device
 * turns out to have WebGPU, whereas a frame pushed through the live path before
 * the engine exists is dropped (it was always dropped — `tryBrowserASR` returns
 * `false` until the model is up), and a frame pushed through the *CPU* engine
 * is minutes stale and cannot be un-run.
 *
 * The cost is that `resolveAsrBackend()` cannot be awaited before the first
 * media request: `getUserMedia`/`getDisplayMedia` must be called synchronously
 * inside the Record click's transient user activation (see `meeting.start()`),
 * so detection is kicked off there and awaited nowhere. By Stop it has always
 * resolved, which is the only place the answer is actually needed.
 */
export function shouldBufferForPostStop(): boolean {
  return activeBackend !== 'webgpu';
}

/**
 * Whether this device can only transcribe after the recording stops.
 *
 * True when the resolved backend is WASM — either because no WebGPU adapter
 * exists, or because every WebGPU encoder in the fallback chain failed to
 * create a session (see `_createEngine`). On such a device the CPU model
 * measured RTF 1.41, so `meeting` buffers the audio and calls
 * `transcribeRecordedAudio()` on Stop rather than handing the model a live
 * stream it cannot keep up with.
 *
 * Unlike `shouldBufferForPostStop()` this is never optimistic: it says "no
 * WebGPU" only once detection has actually said so, because the UI states this
 * to the user as a fact about their device.
 */
export function isPostStopTranscriptionOnly(): boolean {
  return activeBackend === 'wasm';
}

/**
 * Start buffering this recording's audio for transcription after Stop. A no-op
 * on a device that transcribes live, so the capture pipeline can call it
 * unconditionally.
 */
export function beginRecordedAudioCapture(): void {
  // Unconditional: a recording whose mode is decided later must still start
  // from an empty buffer, not append to the previous recording's audio.
  beginPostStopCapture();
  liveFeed.clear();
  recordingMode = null;
  undecidedFrames = [];
  undecidedSamples = 0;
  settleRecordingMode();
}

/**
 * Hand one captured frame to the post-stop recorder. A no-op on a device that
 * transcribes live — and a silent no-op, deliberately: this is called per
 * frame from the capture pipeline, so it must never do work or throw when the
 * live path is in charge.
 */
export function bufferRecordedAudio(source: 'mic' | 'system', pcm: ArrayBuffer, startSample?: number): void {
  settleRecordingMode();
  if (recordingMode === 'post-stop') {
    appendPostStopAudio(source, pcm);
  } else if (recordingMode === null) {
    holdUndecidedFrame(source, pcm, startSample);
  }
}

/**
 * How this recording transcribes, fixed once per recording: `null` until the
 * backend probe has answered after `beginRecordedAudioCapture()`.
 *
 * Fixed, not re-read, because the device's answer moves mid-recording: a
 * WebGPU load that fails steps down to WASM, and a recording that was being
 * transcribed live must not turn into a post-stop run that has no audio.
 */
let recordingMode: 'live' | 'post-stop' | null = null;
/** Frames buffered before `recordingMode` was decided, replayed once it is. */
let undecidedFrames: { source: 'mic' | 'system'; pcm: ArrayBuffer; startSample?: number }[] = [];
let undecidedSamples = 0;
/** Bounds the held frames if the probe never answers: two minutes of audio. */
const MAX_UNDECIDED_SAMPLES = 2 * 60 * CAPTURE_SAMPLE_RATE;

function holdUndecidedFrame(source: 'mic' | 'system', pcm: ArrayBuffer, startSample?: number): void {
  undecidedFrames.push({ source, pcm, startSample });
  undecidedSamples += pcm.byteLength / 2;
  while (undecidedSamples > MAX_UNDECIDED_SAMPLES && undecidedFrames.length > 0) {
    undecidedSamples -= (undecidedFrames.shift() as { pcm: ArrayBuffer }).pcm.byteLength / 2;
  }
}

/**
 * Decide `recordingMode` once the backend is known, and replay the frames held
 * while it was not: into the post-stop buffer on a CPU-only device, through
 * the live path on a WebGPU one — where they used to sit in a buffer nothing
 * ever transcribed.
 */
function settleRecordingMode(): void {
  if (recordingMode !== null || activeBackend === null) return;
  recordingMode = activeBackend === 'wasm' ? 'post-stop' : 'live';
  const held = undecidedFrames;
  undecidedFrames = [];
  undecidedSamples = 0;
  if (recordingMode === 'live') clearPostStopCapture();
  for (const f of held) {
    if (recordingMode === 'post-stop') appendPostStopAudio(f.source, f.pcm);
    else pushLiveAudio(f.source, f.pcm, f.startSample);
  }
}

/** This recording's transcription mode (see `recordingMode`). */
export function getRecordingTranscriptionMode(): 'live' | 'post-stop' | null {
  settleRecordingMode();
  return recordingMode;
}

/**
 * Transcribe everything buffered since `beginRecordedAudioCapture()`.
 *
 * Called by `meeting.stop()`. Resolves `true` when every window transcribed;
 * the model is loaded on demand (the download may still need consent, in which
 * case this resolves `false` and the buffered audio is dropped — the
 * consent dialog says why, and re-recording is the remedy).
 *
 * Never rejects: a failure here is recorded as post-stop progress
 * (`phase: 'error'`, with the message) and logged, because the transcript of
 * a finished meeting must not be lost to an exception in a stop handler.
 */
export async function transcribeRecordedAudioAfterStop(): Promise<boolean> {
  // The recording's own answer: one transcribed live keeps its transcript
  // even if the device fell to WASM before Stop.
  if (getRecordingTranscriptionMode() !== 'post-stop') return false;
  // Checked before the acquisition, not after: a Stop with nothing recorded
  // must not build a 652 MB session in order to transcribe zero seconds of
  // audio. The empty run still reports `done`, so the UI resolves rather than
  // hanging.
  if (!hasBufferedAudio()) {
    return transcribeRecordedAudio(async () => {});
  }
  const engine = await acquireEngine();
  if (engine === null || !engine.isReady) {
    console.error('[asr] The recorded audio could not be transcribed — no model');
    // Drop the buffered PCM (up to ~460 MB) rather than hold it while idle.
    clearPostStopCapture();
    return false;
  }
  const ok = await transcribeRecordedAudio(async (audio, source, isFinal, startSample) => {
    const run = async (part: Float32Array, partStart: number, final: boolean) => {
      windowInFlight = { source, startSample: partStart, samples: part.length };
      try {
        const result = await engine.transcribe(part, source, speakerLabeler(source, part), final);
        if (result.error) {
          throw new Error(result.error);
        }
      } finally {
        windowInFlight = null;
      }
    };
    // A 60 s window usually holds several speakers. Cut it where the
    // diarizer saw the speaker change, so each part becomes its own segment
    // with its own speaker, instead of one minute of text under one name.
    const cuts = speakerTimeline?.changePoints(
      source,
      startSample / CAPTURE_SAMPLE_RATE,
      (startSample + audio.length) / CAPTURE_SAMPLE_RATE,
    ) ?? [];
    let from = 0;
    for (const cut of cuts) {
      const at = Math.round(cut * CAPTURE_SAMPLE_RATE) - startSample;
      if (at - from < POST_STOP_MIN_PART_SAMPLES || audio.length - at < POST_STOP_MIN_PART_SAMPLES) continue;
      await run(audio.subarray(from, at), startSample + from, true);
      from = at;
    }
    await run(audio.subarray(from), startSample + from, isFinal);
  });
  if (!ok) {
    const reason = getPostStopProgress().error;
    console.error('[asr] Transcribing the recorded audio failed', reason ?? 'unknown error');
  }
  return ok;
}

/** Progress of the post-stop job (0-100 over the whole recording), or `null`
 *  when nothing has been transcribed yet. See `post-stop-transcription.ts`. */
export function getPostStopTranscriptionProgress(): PostStopProgress | null {
  return isPostStopTranscriptionOnly() ? getPostStopProgress() : null;
}

/** Whether a post-stop transcription is running right now — the capture
 *  pipeline uses it to refuse a new recording that would interleave with one
 *  still being transcribed. */
export { isPostStopTranscriptionRunning };
export { getServerPostStopProgress, subscribePostStopTranscription } from './post-stop-progress';

/** Enable browser ASR. Lazy-loads the model on first transcription call. */
export function enableBrowserASR(): void {
  browserASREnabled = true;
  setOverlapTranscriber(recognizeOverlapClip);
  notifyBrowserListeners();
}

/** Disable browser ASR. No transcription runs until it's re-enabled. */
export function disableBrowserASR(): void {
  browserASREnabled = false;
  setOverlapTranscriber(null);
  if (browserEngine) {
    browserEngine.disable();
    browserEngine = null;
  }
  browserLoading = false;
  browserReady = false;
  browserFailed = false;
  browserError = null;
  browserErrorKind = null;
  blockedReason = null;
  clearInitProgress();
  // The full teardown drops the recording buffer too: nothing is going to
  // transcribe this audio now, and holding an hour of it for a session the
  // user just switched off is memory nobody asked for.
  clearPostStopCapture();
  undecidedFrames = [];
  undecidedSamples = 0;
  notifyBrowserListeners();
}

/** Check if browser ASR is enabled. */
export function getBrowserASREnabled(): boolean {
  return browserASREnabled;
}

/** Check if the browser model is loaded and ready. */
export function getBrowserASRReady(): boolean {
  return browserReady;
}

/** Check if the browser model failed to load. */
export function getBrowserASRFailed(): boolean {
  return browserFailed;
}

/** Get the current browser ASR error message. */
export function getBrowserASRError(): string | null {
  return browserError;
}

/** What kind of failure `getBrowserASRError()` describes (`null` when there
 *  is none): `'load'` = the ONNX session could not be created, `'transcribe'`
 *  = inference failed on a frame. Download failures live on the registry
 *  entry instead — see the `browserErrorKind` field comment. */
export function getBrowserASRErrorKind(): 'load' | 'transcribe' | null {
  return browserErrorKind;
}

/**
 * What the engine is doing right now — the single value the UI renders and
 * the capture pipeline branches on. See `BrowserASRPhase` for the vocabulary.
 *
 * Derived on read (never stored) so it cannot drift from the flags it is
 * built from: the registry is the source of truth for download progress and
 * terminal download states, the module flags for load/ready/failure.
 */
export function getBrowserASRPhase(): BrowserASRPhase {
  if (!browserASREnabled) return 'disabled';
  // A crashed previous load blocks auto-load but never auto-retries: the next
  // load starts only on Record or explicit Download (see `warmBrowserASR`).
  // Cleared the moment a new explicit load starts (`_loadEngine`) or the user
  // retries with the smaller model.
  if (previousLoadCrashed) return 'blocked';
  if (browserFailed) return 'failed';
  if (browserReady) return 'ready';
  const entry = getModelStatus(PARQUET_REGISTRY_KEY);
  if (entry) {
    if (entry.status === 'downloading') return 'downloading';
    // A download that ended badly, or a backend this browser can't run at
    // all, is terminal for this page session — the user has to act (retry,
    // or pick a different browser), so it is a failure, not a wait.
    if (
      entry.status === 'failed' ||
      entry.status === 'cancelled' ||
      entry.status === 'unavailable'
    ) {
      return 'failed';
    }
  }
  if (browserLoading) return 'loading';
  if (blockedReason) return 'blocked';
  // Last: the device has no usable WebGPU, so there is nothing to load *now*
  // and nothing wrong. Recording is fully available — the audio is buffered
  // and transcribed on Stop. Checked after the load/download states so a real
  // model preparation in progress (the post-stop transcription's own load)
  // still reports itself as such.
  if (isPostStopTranscriptionOnly()) return 'post-stop';
  return 'idle';
}

/**
 * A user-facing explanation for the current phase, or `null` when there is
 * nothing to explain (`ready`/`idle`/`downloading`/`loading` are all states
 * the UI already shows progress for).
 *
 * This is the text that turns a silent no-op into something actionable:
 * without it, a `blocked` phase rendered as nothing at all and a recording
 * simply produced no transcript.
 */
export function getBrowserASRStatusMessage(): string | null {
  // The crash report outranks every other message while it stands: it is the
  // one state that must not auto-resolve into a fresh load attempt.
  if (previousLoadCrashed) return CRASHED_LOAD_MESSAGE;
  switch (getBrowserASRPhase()) {
    case 'blocked':
      return blockedReason;
    case 'failed':
      // A download failure is reported by the registry entry, not by
      // `browserError` (see `getBrowserEngine()`), so prefer whichever has
      // something to say.
      return browserError ?? getModelStatus(PARQUET_REGISTRY_KEY)?.error ?? null;
    case 'post-stop':
      // The one phase whose message is not about a failure at all: the device
      // is fine, the CPU model is simply too slow for live, and the recording
      // is safe. Saying exactly that is what keeps a user from concluding
      // their meeting is being recorded with no transcript.
      return POST_STOP_MESSAGE;
    case 'ready':
      // The CPU model loaded, but it still cannot keep up live — say so, or a
      // ready-but-silent transcript looks like a broken one.
      return isPostStopTranscriptionOnly() ? POST_STOP_MESSAGE : null;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Progress — how far along "getting the model ready" actually is       */
/* ------------------------------------------------------------------ */

/**
 * Which real initialization stages have completed (see `model-progress.ts`).
 *
 * Owned here rather than in the engine because this module is what the UI
 * subscribes to, and because it has to be reset on every new attempt — a
 * retry that kept the previous attempt's "warm-up done" would show a
 * percentage for work that is about to be redone.
 */
let initProgress: InitProgress = emptyInitProgress();

/**
 * Real bytes of the fallback network re-fetch, when one is happening.
 *
 * Not an initialization stage (see `BrowserASRLoadProgress`'s `'fetch'`) and
 * deliberately kept out of `InitProgress`: the weighted arithmetic in
 * `model-progress.ts` is a claim about *completed real work*, and a byte count
 * arriving is not a completed stage. It exists so the load has something true
 * to show while `parakeet.js` quietly re-fetches the whole model because it
 * could not read its cache — the situation that used to look like a hang.
 */
let fetchProgress: { loadedBytes: number; totalBytes: number; file: string } | null = null;

/**
 * Everything the UI needs to render model preparation, in one object.
 *
 * Memoised on read (a fresh object per call would make
 * `useSyncExternalStore` re-render forever) and derived the same way
 * `getBrowserASRPhase()` is, so it cannot disagree with it.
 */
export interface BrowserASRProgress {
  /** Whether the engine is switched on at all. */
  enabled: boolean;
  phase: BrowserASRPhase;
  /** Which half of preparation this is, or `null` when it isn't preparing. */
  stage: ModelProgressStage | null;
  /**
   * 0-100 toward `ready`, or `null` when the current stage cannot be
   * measured (an unmeasured file read, a download with no known total, a
   * resume in progress). `null` means "show an indeterminate bar", never
   * "show 0".
   */
  percent: number | null;
  /** Sub-stage detail, e.g. "2/4 files". Indeterminate stages always have one. */
  detail: string | null;
  /** "Downloading model 42%" / "Initializing model" — null unless preparing. */
  label: string | null;
}

let progressSnapshot: BrowserASRProgress | null = null;

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

function buildProgress(): BrowserASRProgress {
  const phase = getBrowserASRPhase();
  const enabled = browserASREnabled;

  // Ready is the one state with a definite 100%: every other phase is either
  // unmeasurable, mid-preparation, or not preparing at all. See
  // `model-progress.ts` for why the preparing percentages never reach 100.
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
    const percent = initProgressPercent(initProgress);
    // The last stage completing does not make the model ready: the engine has
    // to hand the model back first, and until it does the phase is still
    // `loading`. Without this clamp the bar would flash 100% for one tick
    // before flipping to the real ready state — the exact "100% and still
    // loading" dishonesty the cap exists to prevent.
    const shown = percent === 100 ? 99 : percent;
    return {
      enabled,
      phase,
      stage: 'initializing',
      percent: shown,
      // Sub-stage text, in order of usefulness: the real bytes moving when
      // `parakeet.js` is re-fetching the model over the network (the "stuck at
      // 35%" case), the stage's own name when there is no number to show at
      // all, and nothing when the bar is determinate and the stage speaks for
      // itself.
      detail: describeLoadingDetail(shown),
      label: formatModelProgressLabel('initializing', shown),
    };
  }
  return { enabled, phase, stage: null, percent: null, detail: null, label: null };
}

/**
 * The extra line under an initializing progress bar.
 *
 * The byte line is the important one: when the hub is falling back to the
 * network, the bar is legitimately parked (the file stage *did* complete, and
 * nothing after it has) while gigabytes move. Saying so is the difference
 * between "waiting" and "broken", and it is the fact the engine already has.
 */
function describeLoadingDetail(percent: number | null): string | null {
  if (fetchProgress) {
    const { loadedBytes, totalBytes, file } = fetchProgress;
    const count = totalBytes > 0 ? `${formatBytes(loadedBytes)} of ${formatBytes(totalBytes)}` : formatBytes(loadedBytes);
    return file ? `Fetching ${file}: ${count}` : `Fetching model files: ${count}`;
  }
  return percent === null ? (describeInitStage(initProgress) ?? 'Starting the model') : null;
}

/**
 * Read the current preparation progress. Subscribe with
 * `subscribeBrowserASR`; the returned reference only changes when a value in
 * it changes, so it is safe to use directly as a `useSyncExternalStore`
 * snapshot.
 *
 * Byte-level download progress also re-renders the UI through the *registry's*
 * own subscription (`subscribeRegistry` in `MeetingView`) — `updateProgress`
 * notifies it on every chunk, and nothing here polls to make that happen.
 */
export function getBrowserASRProgress(): BrowserASRProgress {
  const next = buildProgress();
  const prev = progressSnapshot;
  if (prev && sameProgress(prev, next)) return prev;
  progressSnapshot = next;
  return next;
}

/**
 * Server-render snapshot: one frozen constant, so hydration never mismatches
 * and the reference never changes.
 */
const SERVER_PROGRESS: BrowserASRProgress = Object.freeze({
  enabled: false,
  phase: 'idle',
  stage: null,
  percent: null,
  detail: null,
  label: null,
});

/** The server snapshot, for `useSyncExternalStore`'s third argument. */
export function getServerBrowserASRProgress(): BrowserASRProgress {
  return SERVER_PROGRESS;
}

/**
 * Record a load milestone from the engine. Change-only, for the same reason
 * `setBlockedReason()` is: a per-frame path calls into this file constantly
 * and an unconditional notify would re-render every subscriber at capture
 * rate for a state that never changed.
 */
function setInitProgress(next: InitProgress): void {
  if (
    next.filesDone === initProgress.filesDone &&
    next.filesTotal === initProgress.filesTotal &&
    next.sessionsCreated === initProgress.sessionsCreated &&
    next.warmedUp === initProgress.warmedUp
  ) {
    return;
  }
  initProgress = next;
  notifyBrowserListeners();
}

/** Map an engine milestone onto the stage counters the progress layer reads. */
function onLoadProgress(progress: BrowserASRLoadProgress): void {
  switch (progress.stage) {
    case 'files':
      setInitProgress({
        ...initProgress,
        filesDone: progress.done,
        filesTotal: progress.total,
      });
      return;
    case 'fetch':
      setFetchProgress({
        loadedBytes: progress.loadedBytes ?? 0,
        totalBytes: progress.totalBytes ?? 0,
        file: progress.file ?? '',
      });
      return;
    case 'session':
      setInitProgress({ ...initProgress, sessionsCreated: true });
      return;
    case 'warmup':
      setInitProgress({ ...initProgress, warmedUp: true });
      return;
  }
}

/**
 * Record the fallback re-fetch's byte count, change-only and *coarsely*.
 *
 * Change-only for the same reason `setInitProgress()` is: this arrives per
 * network chunk. Coarsely — a new value only counts once it is at least 1% of
 * the file different from the last reported one — because the reported value
 * is a human-readable line ("0.6 GiB of 1.24 GiB"), and re-rendering every
 * subscriber ~60 times a second to move it by a few MiB is cost with no
 * visible result.
 */
function setFetchProgress(next: { loadedBytes: number; totalBytes: number; file: string }): void {
  const prev = fetchProgress;
  if (
    prev &&
    prev.file === next.file &&
    next.totalBytes > 0 &&
    Math.abs(next.loadedBytes - prev.loadedBytes) < next.totalBytes / 100
  ) {
    return;
  }
  if (prev && prev.file === next.file && prev.loadedBytes === next.loadedBytes) return;
  fetchProgress = next;
  notifyBrowserListeners();
}

/** Forget the measured stages. No notify — every caller is already notifying. */
function clearInitProgress(): void {
  initProgress = emptyInitProgress();
  fetchProgress = null;
}

/**
 * Whether the previous page in this tab crashed mid-model-load.
 *
 * While true the module never starts a load on its own (see
 * `warmBrowserASR`): the UI shows `getBrowserASRStatusMessage()` — "The
 * previous model load crashed the tab" — with a button wired to
 * `retryCrashedLoadWithSmallerModel()`. Pressing Record is still allowed; a
 * new explicit load attempt clears this (see `_loadEngine`).
 */
export function didPreviousModelLoadCrash(): boolean {
  return previousLoadCrashed;
}

/**
 * Retry after a crashed load with the smaller, CPU-only (WASM/int8) model.
 *
 * Forces the WASM backend for the rest of the page session, re-registers the
 * differently-sized entry, and re-opens the consent dialog — the consent on
 * file was for the crashed variant's files/size, not this download. Clears
 * the crash report; the next load starts from the dialog, never by itself.
 */
export function retryCrashedLoadWithSmallerModel(): void {
  forceWasmBackend();
  registerDefaultModels('wasm', SMALL_MODEL_AFTER_CRASH_DESCRIPTION);
  resetConsent();
  previousLoadCrashed = false;
  clearLoadMarker();
  browserFailed = false;
  browserError = null;
  browserErrorKind = null;
  setBlockedReason(null);
  openDialog();
  notifyBrowserListeners();
}

/**
 * Switch the speech model family (Parakeet ↔ Nemotron, see
 * `model-family.ts`). Drops the loaded engine — its worker, and with it the
 * sessions — and re-registers the entry for the new family's files on the
 * current backend, so the next Record asks for consent to what will actually
 * download (files already cached are found by the registry's cache probe).
 *
 * Refused (`false`) while a recording, a post-stop transcription or a model
 * load runs: the audio in flight belongs to the engine that is running it, and
 * a load that settled after the switch would install the old family's engine.
 */
export function selectSpeechModel(family: AsrModelFamily): boolean {
  if (getAsrModelFamily() === family) return true;
  if (recordingMode !== null || isPostStopTranscriptionRunning() || enginePromise !== null) return false;
  setAsrModelFamily(family);
  if (browserEngine) {
    browserEngine.disable();
    browserEngine = null;
  }
  browserLoading = false;
  browserReady = false;
  browserFailed = false;
  browserError = null;
  browserErrorKind = null;
  setBlockedReason(null);
  clearInitProgress();
  if (activeBackend !== null) registerDefaultModels(activeBackend);
  notifyBrowserListeners();
  return true;
}

/**
 * Ask the model registry to (re-)open its download consent dialog — the
 * action a UI offers whenever the phase is `blocked`/`failed`. No-op while a
 * dialog is already open, and it never downloads anything by itself: the
 * dialog owns that decision.
 */
export function promptBrowserASRDownload(): void {
  openDialog();
}

/** Subscribe to browser ASR state changes. */
export function subscribeBrowserASR(fn: () => void): () => void {
  browserListeners.add(fn);
  return () => {
    browserListeners.delete(fn);
  };
}

/**
 * Record why no engine is coming, and notify only when that actually changed.
 *
 * The idempotence is not cosmetic: `tryBrowserASR()` is called per captured
 * frame, so a blocked engine re-resolves (cheaply) several times a second. An
 * unconditional notify there would re-render every subscriber at capture
 * rate, for a state nobody can see differently.
 */
function setBlockedReason(reason: string | null): void {
  if (blockedReason === reason) return;
  blockedReason = reason;
  notifyBrowserListeners();
}

/**
 * Get the browser ASR engine, lazy-loading it on first call.
 * Checks the model registry first:
 *   - cached → reuse / create engine pointing at the cached model.
 *   - not-downloaded, no consent → return null (nothing transcribes until
 *     the user accepts the consent dialog).
 *   - not-downloaded, with consent → trigger download with progress tracking.
 * Returns null if browser ASR is not enabled, no backend can load the model,
 * or the model fails to load.
 *
 * Never rejects; every "no engine" outcome also leaves a readable reason
 * behind (see `getBrowserASRStatusMessage()`).
 */
async function getBrowserEngine(): Promise<AsrEngine | null> {
  if (!browserASREnabled) return null;

  // Resolve (and register) the backend for this device. Cheap after the
  // first call: `detectAsrBackend()` is memoised, and re-registering an
  // unchanged manifest is a no-op in the registry.
  const backend = await detectAsrBackend();
  activeBackend = backend;
  settleRecordingMode();
  // The *active* manifest, not `manifestForBackend(backend)`: on a page that
  // has already stepped down the WebGPU fallback order, the first rung is the
  // one that failed.
  const manifest = activeAsrManifest(backend);
  registerDefaultModels(backend);

  // Check registry for model status (always safe, never triggers download).
  let registryEntry = getModelStatus(PARQUET_REGISTRY_KEY);

  // A `cached` status is a `localStorage` claim about this browser's storage,
  // not a reading of it, and it goes stale in ways that break the whole path
  // silently: the user clears the model cache from the console (a supported
  // way to reclaim a multi-gigabyte download), the browser evicts it under
  // storage pressure, or a download could not be written to it at all.
  // Believing the stale claim is what produced the reported failure —
  // `initiateDownloads()` filters `cached` entries out, so the Download button
  // really did nothing; the settings panel really did say "Ready"; and the
  // loader then quietly re-fetched the entire model over the network with no
  // progress wired up, which is the bar frozen on the first initialization
  // stage with no error anywhere.
  //
  // So ask the storage. Four short IndexedDB reads, once per acquisition, and
  // it turns a lie into a normal download with a real percentage.
  if (registryEntry?.status === 'cached') {
    const onDisk = await areModelFilesCached(manifest);
    if (!onDisk.complete) {
      console.warn(
        `[asr] Registry claims the speech model is cached, but ${onDisk.cached} of ` +
          `${onDisk.total} files are actually in IndexedDB — re-downloading.`,
      );
      markNotCached(PARQUET_REGISTRY_KEY);
      registryEntry = getModelStatus(PARQUET_REGISTRY_KEY);
    }
  }

  // Already cached in IndexedDB (detected via registry).
  if (registryEntry?.status === 'cached') {
    return _loadEngine(registryEntry.modelRepo, manifest);
  }

  // Terminal states: don't retry. No transcription runs until the user
  // retries the download (Settings > Speech model) or re-enables browser ASR.
  if (registryEntry?.status === 'failed' || registryEntry?.status === 'cancelled' || registryEntry?.status === 'unavailable') {
    setBlockedReason(
      registryEntry.error ??
      'The speech model could not be downloaded. Retry it in Settings › Speech model.',
    );
    return null;
  }

  // Not yet downloaded — must have explicit consent before downloading.
  if (!isConsentGiven(PARQUET_REGISTRY_KEY)) {
    // The user has not accepted yet (or explicitly declined). Say so instead
    // of returning null in silence: recording continues, but nothing will be
    // transcribed until the model is downloaded, and that has to be visible
    // and actionable rather than a Record button that appears to do nothing.
    setBlockedReason(
      'The speech model has not been downloaded yet, so nothing is being transcribed. ' +
      'Download it to enable on-device transcription.',
    );
    return null;
  }

  // User has given consent — start the download. Whatever was blocking
  // before is resolved by definition from here on.
  setBlockedReason(null);
  browserLoading = true;
  notifyBrowserListeners();

  try {
    // Start (or resume) the download and wait for it.
    await getBrowserASRDownloadManager().initiateDownloadsFor(PARQUET_REGISTRY_KEY);
  } catch (err) {
    // A download failure is tracked on the registry entry itself
    // (`status: 'failed'`, `entry.error` — see `describeDownloadError` in
    // browser-asr-download-manager.ts) and shown there (Settings > Speech
    // model, the consent dialog). Don't also mirror it into `browserError`:
    // that field is reserved for *load* failures (see `browserErrorKind`),
    // and stacking a second, differently-worded copy of the same failure
    // onto it is exactly what produced the confusing "Download failed:
    // WebAssembly.Memory…" message this fallback logic exists to fix.
    // It is logged, though: a silent no-op is what this whole file's state
    // machine now exists to prevent.
    console.error('[asr] Speech model download failed', err);
    browserLoading = false;
    browserEngine = null;
    notifyBrowserListeners();
    return null;
  }

  // Mark as cached, then load (init the ONNX session) — `browserReady` must
  // not flip true until that load actually resolves, or callers see "ready"
  // for a model that hasn't finished initializing yet.
  if (registryEntry) {
    markCached(PARQUET_REGISTRY_KEY);
  }
  return _loadEngine(registryEntry?.modelRepo, manifest);
}

/**
 * Get (or start getting) the engine, sharing one acquisition across every
 * concurrent caller.
 *
 * The sharing matters because the capture pipeline calls this from a
 * per-frame path: without it, every frame of a session that starts before the
 * model is ready would kick off its own backend probe / download / session
 * creation. What *is* re-evaluated on every call is the registry read (a few
 * map lookups) — deliberately not cached, because the user accepting consent
 * or retrying a download has to be noticed immediately, and a stale cache
 * here is the silent-no-op bug all over again. Never rejects: failures are
 * recorded as state (`failed` phase + message) and logged, which is what the
 * UI and the console both read.
 */
/**
 * Turn a session-creation failure into something the user can act on.
 *
 * Most failures are reported verbatim, which is right. The exception is an
 * out-of-memory one: a browser that cannot allocate the model's arena does not
 * always fail politely. Safari kills the WebContent process outright — the tab
 * reappears with "This webpage was reloaded because a problem occurred" and
 * every trace of the attempt is gone — and even where the allocation failure
 * *is* reported, the underlying text ("Array buffer allocation failed",
 * "out of memory", a wasm memory error) says nothing about what to do next.
 *
 * So the memory failures get a sentence that names the cause and the remedy,
 * and everything else keeps its own message. (Prevention lives elsewhere —
 * see `backend-detect.ts`'s device-memory guard and the buffer releasing in
 * `parakeet.ts`; this is the last line, for the cases that get that far.)
 */
function describeLoadFailure(message: string): string {
  const looksLikeMemoryFailure =
    /out of memory|allocation failed|memory access|WebAssembly\.Memory|Array buffer allocation/i.test(message);
  if (!looksLikeMemoryFailure) return `Could not start the model on this device: ${message}`;
  return (
    `This device ran out of memory while starting the speech model (${message}). ` +
    'Close other tabs and try again; if it keeps happening, the smaller CPU-only ' +
    'model in Settings › Speech model uses far less memory.'
  );
}

function acquireEngine(): Promise<AsrEngine | null> {
  if (browserEngine?.isReady) {
    // Reconciling, not just short-circuiting: a session reset keeps the loaded
    // model (see `resetBrowserASR`), so the module's flags can say "not ready"
    // while the engine can transcribe. Publishing the engine's own answer is
    // what stops that state from leaving Record permanently disabled.
    if (!browserReady) {
      browserReady = true;
      notifyBrowserListeners();
    }
    return Promise.resolve(browserEngine);
  }
  if (enginePromise) return enginePromise;
  enginePromise = getBrowserEngine()
    .catch((err: unknown) => {
      // Defensive: `getBrowserEngine` handles its own failures, so reaching
      // here means something in the plumbing itself broke. Record it rather
      // than letting it become an unhandled rejection nobody ever sees.
      const message = err instanceof Error ? err.message : String(err);
      console.error('[asr] Failed to prepare the speech model', err);
      browserFailed = true;
      browserErrorKind = 'load';
      browserError = describeLoadFailure(message);
      browserLoading = false;
      notifyBrowserListeners();
      return null;
    })
    .finally(() => {
      enginePromise = null;
    });
  return enginePromise;
}

/**
 * Make sure an engine is coming, and resolve once the attempt settles.
 * Resolves `true` only when the engine is actually ready to transcribe.
 *
 * This is what `meeting.start()` calls on Record, so pressing Record
 * *starts* the model rather than depending on a frame that would otherwise
 * be dropped. It is the only page-open-adjacent load trigger left — model
 * loads never auto-start (see `warmBrowserASR`).
 */
export function ensureBrowserASRReady(): Promise<boolean> {
  return acquireEngine().then((engine) => engine !== null && engine.isReady);
}

/**
 * Load (or reuse) the engine and only report `browserReady` once
 * `ensureLoaded()` has actually resolved — files being cached in IndexedDB
 * is not the same as the ONNX session being initialized and usable.
 */
async function _loadEngine(
  modelRepo: string | undefined,
  manifest: AsrModelManifest,
): Promise<AsrEngine | null> {
  if (browserEngine?.isReady) return browserEngine;

  // The files are on disk and we're building a session: whatever was
  // blocking (no consent, no download) no longer applies.
  setBlockedReason(null);
  // A new explicit load supersedes the crash report: from here on the phase
  // is `loading`, and if *this* attempt kills the tab the marker below is
  // what the next page finds. Without this, a real failure of the new
  // attempt would hide behind the old crash message.
  previousLoadCrashed = false;
  markLoadInProgress();
  // A previous attempt's stages describe work that is about to happen again,
  // so they must not survive into this one.
  clearInitProgress();
  browserLoading = true;
  notifyBrowserListeners();

  try {
    const engine = await _createEngine(modelRepo, manifest);
    // A successful attempt closes the previous one, including a failed one:
    // without this the `failed` phase outranks `ready` in
    // `getBrowserASRPhase()` and a device that recovered — by retrying, or by
    // stepping down the fallback chain to an encoder that does load — would be
    // stuck showing a failure that no longer exists.
    // Only a real engine closes it: `null` is a fallback step that has just
    // recorded its own failure and must keep reporting it.
    if (engine !== null) {
      browserFailed = false;
      browserError = null;
      browserErrorKind = null;
    }
    browserReady = engine !== null;
    browserLoading = false;
    clearLoadMarker();
    notifyBrowserListeners();
    return engine;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[asr] Speech model failed to load', err);
    browserFailed = true;
    browserErrorKind = 'load';
    browserError = describeLoadFailure(message);
    browserLoading = false;
    browserEngine = null;
    clearLoadMarker();
    notifyBrowserListeners();
    return null;
  }
}

/**
 * Proactively warm the engine once the model is cached and consented to.
 *
 * Deliberately a no-op now: a model load must never auto-start on page open,
 * only on Record (`meeting.start()` → `ensureBrowserASRReady()`) or an
 * explicit Download. The previous behaviour — warming on mount when the
 * entry claimed `cached` — is what turned one Safari OOM kill into a crash
 * loop: every reload re-ran the 2.44 GB load that had just killed the tab.
 * (The crash-loop guard above is the backstop for the same failure; this is
 * the removal of its trigger.)
 *
 * Kept as an exported no-op so existing callers need no change; new code
 * should not call it.
 */
export function warmBrowserASR(): void {
  // The UI gates Record on a *loaded* engine, so something has to build it
  // once the files are on disk — a no-op here left every fresh download stuck
  // on "Preparing model…" with Record disabled. The crash marker is what keeps
  // this from becoming a crash loop: after a load killed the tab the phase is
  // `blocked` and only an explicit retry loads again. The CPU-only model is
  // built on demand after Stop instead, so it is not warmed.
  if (!browserASREnabled || previousLoadCrashed) return;
  if (browserReady || browserLoading || browserFailed) return;
  if (isPostStopTranscriptionOnly()) return;
  void ensureBrowserASRReady().catch((err: unknown) => {
    console.error('[asr] Loading the speech model failed', err);
  });
}

/**
 * Create the engine for `manifest` and load it. The engine runs in its own
 * worker whenever the page can host one (`engine-client.ts`), so loading
 * and inference never block the main thread.
 *
 * If `manifest` is a WebGPU variant and the load fails, this is exactly the
 * "WebGPU session creation fails at runtime" case `detectAsrBackend()` cannot
 * catch by itself (it only confirms an adapter exists, not that a session can
 * actually be created from it — see `backend-detect.ts`). The chain in
 * `asrManifestFallbackOrder()` is then walked one rung down: q4f16 → fp16
 * (both WebGPU), and only then WASM/int8.
 *
 * Every step re-registers the differently-sized, differently-filed entry and
 * asks for consent again: the consent on file was for the *previous* rung's
 * files and size, and the next one differs by 723 MB (q4f16 → fp16) or by a
 * backend, so silently pulling it would be the app deciding for the user.
 */
async function _createEngine(
  modelRepo: string | undefined,
  manifest: AsrModelManifest,
): Promise<AsrEngine | null> {
  const events: BrowserASREvents = {
    onSegment(seg: BrowserSegment) {
      const placed = placeSegment(seg);
      const timeline = speakerTimeline;
      if (!timeline) {
        upsertSegment(placed);
        return;
      }
      replaceSegmentFamily(
        placed.id,
        attributeSpeakers(
          placed,
          (a, b) => timeline.speakerNear(placed.source, a, b),
          (a, b) => timeline.speakerFor(placed.source, a, b),
        ),
      );
    },
    onLanguage(_lang: BrowserLanguageInfo) {
      // Language info is already handled via the existing store
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = _lang;
    },
    onStatusChange() {
      notifyBrowserListeners();
    },
    onLoadProgress(progress) {
      onLoadProgress(progress);
    },
    onError(message: string) {
      // The engine reports its own failures here (both the load and the
      // per-frame inference path). Record them as *state* so the UI can show
      // them; `console.error` happens at the call sites that also have the
      // original error object, so this stays a single line of state-setting
      // rather than a second, differently-worded copy of the same failure.
      browserFailed = true;
      browserErrorKind = 'load';
      browserError = message;
      browserEngine = null;
      notifyBrowserListeners();
    },
  };

  const config = { ...configFromManifest(manifest), ...(modelRepo ? { modelRepo } : {}) };
  const engine = createBrowserASREngine(config, events);

  try {
    await engine.ensureLoaded();
  } catch (err) {
    // A WASM manifest failing is a real, unrecoverable error — there is no
    // smaller rung below it, and pretending otherwise would loop.
    const failedEncoder = webgpuEncoderOf(manifest);
    if (failedEncoder === null) throw err;

    const message = err instanceof Error ? err.message : String(err);
    const nextManifest = forceNextWebgpuEncoder(failedEncoder);
    if (nextManifest !== null) {
      // One rung down, still on the GPU: a driver that cannot run a 4-bit
      // MatMul can usually still run fp16.
      registerManifest(nextManifest);
      resetConsent();
      openDialog();
      console.error(
        `[asr] WebGPU ${failedEncoder} session creation failed, trying ${nextManifest.encoderQuant}`,
        err,
      );
      browserFailed = true;
      browserErrorKind = 'load';
      browserError =
        `Could not start the model on this device using WebGPU (${message}). ` +
        `Falling back to the ${nextManifest.encoderQuant.toUpperCase()} model — confirm the new ` +
        'download to continue using on-device transcription.';
      notifyBrowserListeners();
      // This attempt is done. The next `acquireEngine()` call resolves the
      // active manifest through the now-downgraded detection.
      return null;
    }

    // The WebGPU chain is exhausted. The CPU model cannot transcribe live
    // (RTF 1.41), which is why the phase after this is `post-stop` and not
    // `ready` — the recording is buffered and transcribed when the user stops.
    forceWasmBackend();
    registerDefaultModels('wasm', WASM_FALLBACK_DESCRIPTION);
    resetConsent();
    openDialog();

    console.error(
      '[asr] Every WebGPU encoder failed to create a session, falling back to CPU-only',
      err,
    );
    browserFailed = true;
    browserErrorKind = 'load';
    browserError =
      `Could not start the model on this device using WebGPU (${message}). ` +
      'Falling back to a CPU-only model, which is too slow to transcribe while you talk — your ' +
      'recording will be transcribed after you stop. Confirm the new download to continue.';
    notifyBrowserListeners();

    // This attempt is done — nothing transcribes until the user
    // (re-)consents to the WASM download. The next `acquireEngine()` call
    // resolves the WASM manifest via the now-forced detection.
    return null;
  }

  browserEngine = engine;
  return engine;
}

/**
 * The provisional speaker label for a window, read when it is transcribed.
 *
 * Diarization reports a turn only once it has closed, so at transcription
 * time the speaker of the newest audio is usually unknown. This supplies a
 * guess (`diarization-bridge.ts` uses the last speaker it saw); the
 * `SpeakerTimeline` below replaces it once a turn covers the segment.
 *
 * Without diarization every source gets one default speaker id, in the
 * "<source>:<index>" shape `lib/meeting/store.ts` (`ensureSpeaker`)
 * understands.
 */
export type SpeakerLabeler = (source: 'mic' | 'system', audio: Float32Array) => string;

function defaultSpeakerLabeler(source: 'mic' | 'system'): string {
  return `${source}:0`;
}

let speakerLabeler: SpeakerLabeler = defaultSpeakerLabeler;

/** Install a speaker labeler, or pass `null` to restore the single-speaker-per-source default. */
export function setSpeakerLabeler(labeler: SpeakerLabeler | null): void {
  speakerLabeler = labeler ?? defaultSpeakerLabeler;
}

/**
 * Who spoke when, on the capture timeline (seconds since Record, per source —
 * the clock `index.ts` stamps every frame with). `diarization-bridge.ts`
 * installs one built from the diarizer's turns.
 */
export interface SpeakerTimeline {
  /** The speaker with the most turn time inside `[start, end]`, or `null`
   *  when no turn overlaps it yet. */
  speakerFor(source: 'mic' | 'system', start: number, end: number): string | null;
  /** `speakerFor`, or when no turn overlaps the span the speaker of the
   *  nearest turn; `null` only before the source's first turn. */
  speakerNear(source: 'mic' | 'system', start: number, end: number): string | null;
  /** Times inside `(start, end)` where one speaker's turn gives way to a
   *  different speaker's. */
  changePoints(source: 'mic' | 'system', start: number, end: number): number[];
  /** Times inside `(start, end)` where a turn ended. */
  turnEnds(source: 'mic' | 'system', start: number, end: number): number[];
}

let speakerTimeline: SpeakerTimeline | null = null;

/** Install the diarization timeline, or `null` to label by `SpeakerLabeler` alone. */
export function setSpeakerTimeline(timeline: SpeakerTimeline | null): void {
  speakerTimeline = timeline;
}

/** The audio of the inference in progress, on the capture timeline. Set just
 *  before `engine.transcribe()`, whose segments arrive before it resolves. */
let windowInFlight: { source: 'mic' | 'system'; startSample: number; samples: number } | null = null;

/** Capture-timeline span of each open segment: the engine keeps one segment
 *  id across windows until it closes, so the span grows with it. */
const segmentSpans = new Map<string, { start: number; end: number }>();

/** Words of each open segment so far, on the capture timeline: a call's words
 *  arrive relative to its own audio, the segment text spans several calls. */
const segmentWords = new Map<string, SegmentWord[]>();

/**
 * Convert an engine segment for the store: timestamps on the capture timeline
 * and the speaker the diarization timeline gives for that span.
 *
 * The engine's own `start`/`end` are not audio positions (they are derived
 * from the inference's wall-clock time), so they can be neither shown nor
 * matched against speaker turns. When the window's position is unknown (a
 * caller without a capture clock), the engine's values pass through.
 */
function placeSegment(seg: BrowserSegment): Segment {
  let start = seg.start;
  let end = seg.end;
  let words: SegmentWord[] | undefined;
  const win = windowInFlight;
  if (win && win.source === seg.source) {
    const winStart = win.startSample / CAPTURE_SAMPLE_RATE;
    const winEnd = (win.startSample + win.samples) / CAPTURE_SAMPLE_RATE;
    const span = segmentSpans.get(seg.id);
    start = span ? Math.min(span.start, winStart) : winStart;
    end = span ? Math.max(span.end, winEnd) : winEnd;
    if (seg.final) segmentSpans.delete(seg.id);
    else segmentSpans.set(seg.id, { start, end });
    if (seg.words) {
      words = [
        ...(segmentWords.get(seg.id) ?? []),
        ...seg.words.map((w) => ({
          text: w.text,
          start: winStart + w.start,
          end: winStart + w.end,
          ...(w.confidence !== undefined ? { confidence: w.confidence } : {}),
        })),
      ];
      if (seg.final) segmentWords.delete(seg.id);
      else segmentWords.set(seg.id, words);
    }
  }
  const speaker = speakerTimeline?.speakerFor(seg.source, start, end) ?? seg.speaker;
  const lowConfSpans = seg.final && words ? lowConfidenceSpans(seg.text, words) : [];
  return {
    id: seg.id,
    source: seg.source,
    speaker,
    text: seg.text,
    start,
    end,
    final: seg.final,
    ...(words ? { words } : {}),
    ...(lowConfSpans.length > 0 ? { lowConfSpans } : {}),
  };
}

/** Words below this confidence are kept as `Segment.lowConfSpans`. */
export const LOW_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Locate each low-confidence word in `text` as UTF-16 offsets. Words are
 * matched in order, each after the previous one, so a repeated word finds its
 * own occurrence; a word that cannot be found is skipped rather than guessed.
 */
export function lowConfidenceSpans(text: string, words: SegmentWord[]): LowConfSpan[] {
  const spans: LowConfSpan[] = [];
  let cursor = 0;
  for (const w of words) {
    const needle = w.text.trim();
    if (!needle) continue;
    const at = text.indexOf(needle, cursor);
    if (at < 0) continue;
    cursor = at + needle.length;
    if (w.confidence !== undefined && w.confidence < LOW_CONFIDENCE_THRESHOLD) {
      const last = spans[spans.length - 1];
      // Adjacent low words share one span (the lowest confidence wins).
      if (last && last[1] >= at) {
        last[1] = cursor;
        last[2] = Math.min(last[2], w.confidence);
      } else {
        spans.push([at, cursor, w.confidence]);
      }
    }
  }
  return spans;
}

/* ------------------------------------------------------------------ */
/* Live audio → transcription windows                                    */
/* ------------------------------------------------------------------ */

/** Shortest part a post-stop window is cut into at a speaker change: a cut
 *  closer than this to either end costs an inference for a word or two. */
const POST_STOP_MIN_PART_SAMPLES = CAPTURE_SAMPLE_RATE * 2;

/**
 * One chunker per source: it decides which audio each inference re-reads and
 * turns the words into segments (see `live-chunker.ts` for why the live path
 * no longer sends fixed 2 s slices).
 */
const liveChunkers = new Map<'mic' | 'system', LiveChunker>();
/** Never reset: a segment id must not come back within a page's life. */
let liveSegmentCounter = 0;
/** When each source was last served, so one busy source cannot starve the
 *  other of the single engine. */
const liveServedAt = new Map<'mic' | 'system', number>();
let liveServeCounter = 0;
/** Stop is draining the chunkers: no new window may start behind it. */
let liveFlushing = false;
/** Bumped whenever the chunkers are cleared: a window that answers after
 *  that belongs to a finished recording and must not write to the store. */
let liveGeneration = 0;

function liveChunker(source: 'mic' | 'system'): LiveChunker {
  let chunker = liveChunkers.get(source);
  if (!chunker) {
    chunker = new LiveChunker(() => `live-${++liveSegmentCounter}`);
    liveChunkers.set(source, chunker);
  }
  return chunker;
}

/**
 * Feed one captured frame (Int16 PCM) to live transcription. Frames are
 * buffered per source; the engine re-reads a source's open utterance once
 * enough new speech has arrived or a pause ends it, one inference at a time.
 */
export function pushLiveAudio(source: 'mic' | 'system', pcm: ArrayBuffer, startSample?: number): void {
  if (!browserASREnabled || pcm.byteLength === 0 || pcm.byteLength % 2 !== 0) return;
  const feed = liveFeedOf(source);
  if (!browserEngine?.isReady) {
    // Not ready yet: start the load, and drop the frame — reported as the
    // visible loading state rather than silence.
    feed.droppedNotReady += 1;
    void acquireEngine();
    return;
  }
  feed.frames += 1;
  liveChunker(source).push(int16ToFloat32(pcm), startSample);
  pumpLiveAudio();
}

/** What one source has given live transcription this recording, for the
 *  capture diagnostics readout. */
export interface LiveAsrFeed {
  /** Frames handed to the source's chunker. */
  frames: number;
  /** Frames dropped because the model was not ready yet. */
  droppedNotReady: number;
  /** Frames the speech gate passed as speech. */
  speechFrames: number;
  /** The gate's noise floor (frame RMS). */
  noiseFloor: number;
  /** Inferences run, and the words and segment updates they produced. */
  windows: number;
  words: number;
  segments: number;
}

type FeedCounts = Omit<LiveAsrFeed, 'speechFrames' | 'noiseFloor'>;

/** Reset by `beginRecordedAudioCapture`, i.e. at every Record. */
const liveFeed = new Map<'mic' | 'system', FeedCounts>();

function liveFeedOf(source: 'mic' | 'system'): FeedCounts {
  let feed = liveFeed.get(source);
  if (!feed) {
    feed = { frames: 0, droppedNotReady: 0, windows: 0, words: 0, segments: 0 };
    liveFeed.set(source, feed);
  }
  return feed;
}

/** Per-source live transcription counts since Record. */
export function getLiveAsrFeed(): Partial<Record<'mic' | 'system', LiveAsrFeed>> {
  const out: Partial<Record<'mic' | 'system', LiveAsrFeed>> = {};
  for (const [source, feed] of liveFeed) {
    const chunker = liveChunkers.get(source);
    out[source] = { ...feed, speechFrames: chunker?.speechFrames ?? 0, noiseFloor: chunker?.noiseFloor ?? 0 };
  }
  return out;
}

/** Sources whose open segment is on screen as a partial. A due source not in
 *  here has shown nothing yet, so its first partial goes ahead of the other
 *  source's update. */
const liveShowing = new Set<'mic' | 'system'>();

/** Page-side timestamps for the latency trace (`asr-debug`), per source. */
const liveGateOpenAt = new Map<'mic' | 'system', number>();

/** Start the next due window, if the engine is free: a source with no partial
 *  shown yet goes first, then the one served least recently. */
function pumpLiveAudio(): void {
  if (transcribeInFlight || liveFlushing) return;
  const engine = browserEngine?.isReady ? browserEngine : null;
  if (!engine) return;
  let next: 'mic' | 'system' | null = null;
  for (const [source, chunker] of liveChunkers) {
    if (!chunker.due()) continue;
    if (next === null) {
      next = source;
      continue;
    }
    const firstNow = !liveShowing.has(source);
    const firstNext = !liveShowing.has(next);
    if (firstNow !== firstNext) {
      if (firstNow) next = source;
    } else if ((liveServedAt.get(source) ?? 0) < (liveServedAt.get(next) ?? 0)) {
      next = source;
    }
  }
  if (next === null) return;
  const req = liveChunker(next).take();
  if (!req) return;
  liveServedAt.set(next, ++liveServeCounter);
  if (debugEnabled()) {
    const now = performance.now();
    if (!liveShowing.has(next) && !liveGateOpenAt.has(next)) liveGateOpenAt.set(next, now);
    console.debug(
      `[asr-latency] take ${next} t=${now.toFixed(0)}ms window=${(req.audio.length / CAPTURE_SAMPLE_RATE).toFixed(2)}s` +
        ` firstPartial=${!liveShowing.has(next)} sinceFirstTake=${(now - (liveGateOpenAt.get(next) ?? now)).toFixed(0)}ms`,
    );
  }
  void recognizeLiveWindow(engine, next, req).then(() => pumpLiveAudio());
}

/** Longest clip the overlap second pass hands the engine. It costs engine
 *  time the live windows would otherwise use, so a long overlap is read from
 *  its start only: the words are recovered where the two voices first collide. */
export const OVERLAP_CLIP_MAX_SECONDS = 8;
/** How long a clip waits for the engine to go idle before it is dropped. */
const OVERLAP_CLIP_WAIT_MS = 1000;

/** True while a live window is running or one is waiting to run. */
function liveBusy(): boolean {
  if (transcribeInFlight || liveFlushing) return true;
  for (const chunker of liveChunkers.values()) if (chunker.due()) return true;
  return false;
}

/**
 * One clip for the overlap second pass (`overlap-retranscribe.ts`), on the
 * already-loaded live engine (Parakeet or Nemotron alike). The live windows
 * have priority: the clip runs only in an idle gap, and is dropped (no words)
 * if the engine does not go idle within `OVERLAP_CLIP_WAIT_MS` or a live
 * window falls due while it waits, so the live transcript is never delayed
 * by more than the clip already running.
 */
async function recognizeOverlapClip(audio: Float32Array): Promise<TimedWord[]> {
  if (getRecordingTranscriptionMode() === 'post-stop') return [];
  const deadline = Date.now() + OVERLAP_CLIP_WAIT_MS;
  while (liveBusy() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const engine = browserEngine?.isReady ? browserEngine : null;
  if (!engine || liveBusy()) return [];
  const clip = audio.length > OVERLAP_CLIP_MAX_SECONDS * CAPTURE_SAMPLE_RATE
    ? audio.subarray(0, OVERLAP_CLIP_MAX_SECONDS * CAPTURE_SAMPLE_RATE)
    : audio;
  transcribeInFlight = true;
  try {
    const result = await engine.recognize(clip);
    return result.error ? [] : result.words;
  } catch (err) {
    console.warn('[asr] Overlap clip failed', err);
    return [];
  } finally {
    transcribeInFlight = false;
    pumpLiveAudio();
  }
}

setOverlapTranscriber(recognizeOverlapClip);

async function recognizeLiveWindow(
  engine: AsrEngine,
  source: 'mic' | 'system',
  req: LiveWindowRequest,
): Promise<boolean> {
  const chunker = liveChunker(source);
  const generation = liveGeneration;
  transcribeInFlight = true;
  try {
    const startedAt = debugEnabled() ? performance.now() : 0;
    const result = await engine.recognize(req.audio);
    // Stop gave up on this window and closed its segment already.
    if (generation !== liveGeneration) return false;
    if (startedAt) {
      const replyAt = performance.now();
      console.debug(
        `[asr-latency] reply ${source} t=${replyAt.toFixed(0)}ms inference=${(replyAt - startedAt).toFixed(0)}ms`,
      );
    }
    if (result.error) {
      liveShowing.delete(source);
      chunker.abort();
      console.error('[asr] Transcription failed', result.error);
      return false;
    }
    // The diarizer only reports a turn once it has closed, so a speaker
    // change is known after the fact; the chunker closes the open segment
    // there, and what follows becomes the next speaker's segment.
    const openStart = chunker.openStartSample / CAPTURE_SAMPLE_RATE;
    const windowEnd = (req.startSample + req.audio.length) / CAPTURE_SAMPLE_RATE;
    const turnEnd = req.final ? undefined : speakerTimeline?.turnEnds(source, openStart, windowEnd)[0];
    const updates = chunker.apply(
      req,
      result.words,
      turnEnd === undefined ? undefined : Math.round(turnEnd * CAPTURE_SAMPLE_RATE),
    );
    const feed = liveFeedOf(source);
    feed.windows += 1;
    feed.words += result.words.length;
    feed.segments += updates.length;
    for (const update of updates) {
      publishLiveUpdate(source, update, speakerTimeline, () => speakerLabeler(source, req.audio));
      if (update.final) liveShowing.delete(source);
      else liveShowing.add(source);
    }
    if (debugEnabled() && updates.length > 0) {
      console.debug(`[asr-latency] apply ${source} t=${performance.now().toFixed(0)}ms segments=${updates.length}`);
      if (updates[updates.length - 1].final) liveGateOpenAt.delete(source);
    }
    return true;
  } catch (err) {
    if (generation !== liveGeneration) return false;
    liveShowing.delete(source);
    chunker.abort();
    console.error('[asr] Live transcription failed', err);
    return false;
  } finally {
    // A stale window must not clear the flag a newer recording's window holds.
    if (generation === liveGeneration) transcribeInFlight = false;
  }
}

/** How long Stop waits for an inference still running before it gives up on
 *  it and closes the open segment with the words already shown. */
export const LIVE_FLUSH_WAIT_MS = 30_000;
/** Most windows Stop reads per source: a backlog at the cap takes two or
 *  three; the bound only stops a window that commits nothing from looping. */
const LIVE_FLUSH_MAX_WINDOWS = 6;
const LIVE_FLUSH_POLL_MS = 50;

function liveBufferedSamples(): number {
  let samples = 0;
  for (const chunker of liveChunkers.values()) samples += chunker.bufferedSamples;
  return samples;
}

/**
 * Transcribe whatever live audio is still buffered and close each source's
 * segment. Called on Stop, before the session state is reset.
 *
 * Inference can fall behind real time, so this may have up to two capped
 * windows per source to read; their progress is published for the dock's
 * "Finishing transcription" state. Every segment ends final: one whose last
 * window cannot run (the engine gone, an inference that failed or is still
 * stuck after `LIVE_FLUSH_WAIT_MS`) is closed with the words already shown,
 * and a stuck window's late answer is dropped (`liveGeneration`).
 */
export async function flushLiveAudio(): Promise<void> {
  liveFlushing = true;
  beginLiveFlush(liveBufferedSamples());
  try {
    // Wait out an inference that is still running (it holds the engine).
    for (let waited = 0; transcribeInFlight && waited < LIVE_FLUSH_WAIT_MS; waited += LIVE_FLUSH_POLL_MS) {
      await new Promise((resolve) => setTimeout(resolve, LIVE_FLUSH_POLL_MS));
    }
    updateLiveFlush(liveBufferedSamples());
    for (const source of ['mic', 'system'] as const) {
      const chunker = liveChunkers.get(source);
      if (!chunker) continue;
      for (let i = 0; i < LIVE_FLUSH_MAX_WINDOWS; i += 1) {
        const engine = browserEngine?.isReady ? browserEngine : null;
        const req = engine ? chunker.take(true) : null;
        if (!engine || !req) break;
        const ok = await recognizeLiveWindow(engine, source, req);
        updateLiveFlush(liveBufferedSamples());
        if (!ok || req.final) break;
      }
      for (const update of chunker.finish()) {
        publishLiveUpdate(source, update, speakerTimeline, () => speakerLabeler(source, new Float32Array(0)));
      }
    }
  } finally {
    liveFlushing = false;
    endLiveFlush();
    clearLiveAudio();
  }
}

function clearLiveAudio(): void {
  liveGeneration += 1;
  liveChunkers.clear();
  liveServedAt.clear();
  liveShowing.clear();
  liveGateOpenAt.clear();
  segmentSpans.clear();
  segmentWords.clear();
}

/**
 * Attempt browser ASR transcription of one captured frame. Returns true if
 * the engine handled it, false otherwise — the caller drops the frame (there
 * is no other transcription path to fall back to).
 *
 * Never rejects, and never leaves the caller without an explanation: when the
 * engine isn't ready yet this *starts* the acquisition (once, shared — see
 * `acquireEngine()`) and the phase it leaves behind (`loading`, `downloading`,
 * `blocked`, `failed`) is what the UI renders. That is the whole point of
 * returning early instead of deadlocking: this used to be reached only when
 * the engine was *already* ready, and the engine only ever became ready
 * through this function — a cycle that could never start, so a session could
 * record forever and never produce a segment.
 */
export async function tryBrowserASR(
  audio: Float32Array,
  source: 'mic' | 'system',
  isFinal: boolean,
  startSample?: number,
): Promise<boolean> {
  if (!browserASREnabled) return false;

  const engine = browserEngine?.isReady ? browserEngine : null;
  if (!engine) {
    // Not ready yet: kick off the load/download and drop this frame. The
    // frames captured before the model is up are lost — unavoidable, and
    // reported as a visible "loading" state rather than silence.
    void acquireEngine();
    return false;
  }

  // One inference at a time. `parakeet.js` keeps a single decoder state and
  // is not re-entrant; without this, a fast capture stream (two sources, ~10
  // frames/s each) piles up overlapping transcribes of the same audio.
  if (transcribeInFlight) return false;
  transcribeInFlight = true;
  windowInFlight = startSample === undefined ? null : { source, startSample, samples: audio.length };

  try {
    const result = await engine.transcribe(
      audio,
      source,
      speakerLabeler(source, audio),
      isFinal,
    );
    if (result.error) {
      // `transcribe()` reports inference failures by returning them (it also
      // raises `onError`, which records the visible state) instead of
      // throwing. Log it here so nothing is lost even if that event wiring
      // ever changes.
      console.error('[asr] Transcription failed', result.error);
      return false;
    }
    return true;
  } catch (err) {
    // Defensive net: a future engine could throw instead of returning.
    console.error('[asr] Transcription threw', err);
    browserFailed = true;
    browserErrorKind = 'transcribe';
    browserError = `Could not transcribe audio: ${err instanceof Error ? err.message : String(err)}`;
    notifyBrowserListeners();
    return false;
  } finally {
    transcribeInFlight = false;
    windowInFlight = null;
  }
}

/**
 * Reset *session* state for a new recording. Deliberately does NOT drop the
 * loaded engine.
 *
 * This used to null `browserEngine` after `stop()`, which meant every
 * Record → stop → Record cycle threw away a multi-hundred-megabyte model and
 * built a second one while the first was still being collected. `parakeet.js`
 * 1.4.4 has no `release()` for its ONNX sessions, so nothing freed the first
 * one deterministically — and on Safari the resulting peak allocation is what
 * killed the WebContent process (the tab reloads with "a problem occurred").
 * One loaded model per page is a much smaller steady state, and it makes the
 * next Record instant.
 *
 * `disableBrowserASR()` is the full teardown.
 */
export function resetBrowserASR(): void {
  if (browserEngine) {
    // `stop()` only clears session state now (see the engine's own doc), but
    // keep the log: a future teardown-with-real-release belongs here, and a
    // swallowed failure there would be invisible.
    browserEngine.stop().catch((err) => {
      console.error('[asr] Failed to reset the speech model between sessions', err);
    });
  }
  browserLoading = false;
  browserReady = false;
  browserFailed = false;
  browserError = null;
  browserErrorKind = null;
  blockedReason = null;
  // `enginePromise` is deliberately left alone: an acquisition that is still
  // in flight when a session stops must stay deduped, or the next session
  // starts a second download/session build for the same model.
  transcribeInFlight = false;
  clearLiveAudio();
  clearInitProgress();
  notifyBrowserListeners();
}

// Initialize registry on module load (lazy, not at page load). Backend
// detection is async, so this can't set `activeBackend` synchronously the
// way the old (WebGPU-only, `isWebGPUAvailable()`-gated) version did — but
// nothing here needs to block on it: `getBrowserEngine()` re-resolves the
// backend itself on first real use, and this just gets the registry entry
// (and consent dialog) showing the right model as early as possible.
//
// The crash-loop guard is read here, not in a load path: a marker left by a
// load that killed the previous page must be visible before anything could
// start another load. Read unconditionally — `readLoadMarker()` is safe
// without a DOM — while the rest still waits for `window`.
previousLoadCrashed = readLoadMarker();
if (typeof window !== 'undefined') {
  initRegistry();
  void resolveAsrBackend();
  // A page that gets to run `pagehide` did not crash: a reload or dev
  // refresh mid-load must not leave the marker for the next page to read as
  // one (the stranded marker `deriveModelReadiness` has to read past). Only
  // this page's own marker, though: one it booted with is the previous page's
  // crash, and a reload of the blocked page must stay blocked. A page
  // restored from the back/forward cache resumes its load, and its marker.
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => {
      if (ownsLoadMarker) clearLoadMarker();
    });
    window.addEventListener('pageshow', (ev) => {
      if ((ev as PageTransitionEvent).persisted && browserLoading) markLoadInProgress();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Exports for the model download feature (consumed by routing layer)  */
/* ------------------------------------------------------------------ */

export { PARQUET_REGISTRY_KEY, initRegistry, registerDefaultModels };
export type { ModelEntry } from '@/lib/asr/browser';
export {
  subscribeRegistry,
  getServerSnapshot,
  getModelStatus,
  initiateDownloads,
  markCached,
} from '@/lib/asr/browser';

