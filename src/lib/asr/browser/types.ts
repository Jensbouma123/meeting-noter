import { PARAKEET_TDT_V3_WEBGPU, type AsrBackend, type AsrModelManifest } from './model-manifest';

/** Browser ASR status lifecycle. */
export type BrowserASRStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'transcribing'
  | 'error'
  | 'disabled';

/**
 * What the engine is doing right now, from the *caller's* point of view — the
 * one value the UI renders and the capture pipeline branches on.
 *
 * Deliberately separate from `BrowserASRStatus` (the engine's own internal
 * lifecycle, which never knows about downloads or consent): this is the phase
 * that answers "will this recording produce a transcript, and if not, why?".
 *
 * - `disabled` — the user turned the engine off. Nothing transcribes.
 * - `idle` — enabled, but nothing has asked for the model yet (no session, no
 *   warm-up). Not a failure.
 * - `downloading` — consented, model files are arriving.
 * - `loading` — files are cached, the ONNX session is being created.
 * - `ready` — transcribing.
 * - `blocked` — nothing will start until the user acts (typically: the model
 *   has not been downloaded/confirmed yet). The UI must offer the action.
 * - `failed` — a download or a load failed; the message says which.
 * - `post-stop` — nothing is wrong and nothing is being transcribed *now*:
 *   this device has no usable WebGPU, so the CPU model (which needs 1.41 s of
 *   compute per second of audio) is used on the finished recording instead.
 *   Recording is fully available; `getBrowserASRStatusMessage()` states what
 *   will happen and when.
 */
export type BrowserASRPhase =
  | 'disabled'
  | 'idle'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'post-stop';

/** Source of a transcription segment — mirrors the realtime protocol Segment. */
export interface BrowserSegment {
  id: string;
  source: 'mic' | 'system';
  speaker: string;
  text: string;
  start: number;
  end: number;
  final: boolean;
  /** Words newly recognised by the call that produced this segment, times in
   *  seconds from the start of that call's audio. The text may hold earlier
   *  calls' words too (an open segment keeps its id across calls). */
  words?: BrowserWord[];
}

/** Language info for the browser ASR path. */
export interface BrowserLanguageInfo {
  code: string;
  name: string;
  locked: boolean;
  confidence: number;
}

/** Result of a single browser ASR transcription call. */
export interface BrowserTranscribeResult {
  segments: BrowserSegment[];
  language: BrowserLanguageInfo | null;
  error: string | null;
}

/** One recognised word, times in seconds from the start of the audio. */
export interface BrowserWord {
  text: string;
  start: number;
  end: number;
  /** The model's confidence (0 … 1), averaged over the word's tokens. */
  confidence?: number;
}

/** Result of `recognize()`: the words in one window, nothing carried over. */
export interface BrowserRecognizeResult {
  text: string;
  words: BrowserWord[];
  error: string | null;
}

/**
 * Configuration for the browser ASR engine. Deliberately *not* hardcoded to
 * the WebGPU manifest's literal values (`backend: 'webgpu-hybrid'`,
 * `encoderQuant: 'fp32'`) the way this used to be: those are only correct for
 * the WebGPU variant, and a hardcoded config here is exactly how the engine
 * could end up requesting fp32/webgpu-hybrid for a model that was actually
 * downloaded as the WASM/int8 variant — a guaranteed cache miss (wrong
 * filename) at best, a repeat of the WASM-memory-limit failure at worst. Use
 * `configFromManifest()` to build one from whichever manifest was actually
 * selected (see `model-manifest.ts` / `backend-detect.ts`).
 */
export interface BrowserASRConfig {
  /** Which engine runs the files (`engine-factory.ts`); absent = Parakeet. */
  engine?: AsrModelManifest['engine'];
  /** HF repo id for the model's ONNX files. */
  modelRepo: string;
  /** Target language code (ISO 639-1). Dutch-only in this pilot. */
  language: string;
  backend: AsrModelManifest['backend'];
  /**
   * Encoder quantization. Explicit rather than left to `parakeet.js`, which
   * silently force-upgrades `int8` to `fp32` on any webgpu* backend.
   */
  encoderQuant: AsrModelManifest['encoderQuant'];
  /** Preprocessor backend: 'js' uses pure JS mel computation. */
  preprocessorBackend: AsrModelManifest['preprocessorBackend'];
  /** Decoder quantization for the joiner model. */
  decoderQuant: AsrModelManifest['decoderQuant'];
  /**
   * Which of the two high-level backends (`'webgpu'` | `'wasm'`) this config
   * targets. Drives the runtime-fallback decision in `browser-asr.ts`: only a
   * `'webgpu'` config that fails to load is a candidate for falling back to
   * WASM — a `'wasm'` config failing to load is a real, unrecoverable error.
   */
  asrBackend: AsrBackend;
  /**
   * Every file this model is made of, in download order — the manifest's own
   * list (see `AsrModelManifest.files`).
   *
   * Carried on the config so the engine can *count* the file stage of
   * initialization and wire each file to the right slot in `fromUrls`. The
   * count is what gives the bar a denominator for "3 of 4 files read" — the
   * initialization half of the progress bar is otherwise unmeasurable (see
   * `model-progress.ts`).
   */
  files: readonly string[];
  /**
   * Per-file download URL overrides, straight from the manifest (see
   * `AsrModelManifest.fileUrlOverrides`) — files no public repo ships, like
   * the self-built fp16 encoder. The load path passes each entry through to
   * the resumable downloader; absent/empty means "everything from the repo".
   */
  fileUrlOverrides?: Readonly<Record<string, string>>;
  /**
   * WASM thread count for session creation, when the caller has already
   * decided it. Unset means the engine decides (one thread on Safari).
   * Set by `engine-client.ts`: inside a worker `navigator.vendor` does not
   * exist, so the engine cannot recognise Safari there on its own.
   */
  cpuThreads?: number;
}

/** Build an engine config from a resolved manifest (see `manifestForBackend`). */
export function configFromManifest(manifest: AsrModelManifest, language = 'nl'): BrowserASRConfig {
  return {
    engine: manifest.engine,
    modelRepo: manifest.modelRepo,
    language,
    backend: manifest.backend,
    encoderQuant: manifest.encoderQuant,
    preprocessorBackend: manifest.preprocessorBackend,
    decoderQuant: manifest.decoderQuant,
    asrBackend: manifest.asrBackend,
    files: manifest.files,
    ...(manifest.fileUrlOverrides ? { fileUrlOverrides: manifest.fileUrlOverrides } : {}),
  };
}

/**
 * A real, completed step of model initialization.
 *
 * ORT exposes no progress events at all, so the engine reports the milestones
 * it can actually observe instead of a fabricated percentage — see
 * `model-progress.ts` for how these are weighted into one.
 */
/**
 * A real, completed step of model initialization.
 *
 * ORT exposes no progress events at all, so the engine reports the milestones
 * it can actually observe instead of a fabricated percentage — see
 * `model-progress.ts` for how these are weighted into one.
 */
export interface BrowserASRLoadProgress {
  /**
   * `'files'`, `'session'` and `'warmup'` are initialization stages, weighted
   * by `model-progress.ts`.
   *
   * `'fetch'` is not one: it is the byte count of a file that is *not* in the
   * cache being downloaded during the load. It is a separate stage precisely
   * because it must not be able to claim a completed initialization stage — it
   * is reported only so the load stops looking frozen while it happens, and
   * carries its numbers in `loadedBytes`/`totalBytes` rather than in
   * `done`/`total`.
   */
  stage: 'files' | 'fetch' | 'session' | 'warmup';
  /** Files read out of the cache (`stage: 'files'`). */
  done: number;
  /** Files the manifest lists (`stage: 'files'`). */
  total: number;
  /** Bytes fetched over the network (`stage: 'fetch'`). */
  loadedBytes?: number;
  /** Bytes the current file needs in total (`stage: 'fetch'`), `0` if unknown. */
  totalBytes?: number;
  /** The file currently being fetched (`stage: 'fetch'`), so the UI can name it. */
  file?: string;
}

/** Events emitted by the browser ASR engine. */
export interface BrowserASREvents {
  onSegment(seg: BrowserSegment): void;
  onLanguage(lang: BrowserLanguageInfo): void;
  onStatusChange(status: BrowserASRStatus): void;
  onError(message: string): void;
  /**
   * Optional: a load milestone completed. Purely for the progress UI — the
   * engine loads and works exactly the same whether or not anyone listens.
   */
  onLoadProgress?(progress: BrowserASRLoadProgress): void;
}

/** Default browser ASR configuration — the WebGPU manifest, used only until
 *  the actual detected/selected backend's config is known. */
export const DEFAULT_BROWSER_ASR_CONFIG: BrowserASRConfig = configFromManifest(PARAKEET_TDT_V3_WEBGPU);

/** Language names for the supported Dutch-only pilot. */
export const BROWSER_ASR_LANGUAGE_NAMES: Record<string, string> = {
  nl: 'Nederlands',
};
