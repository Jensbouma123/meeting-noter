import { ParakeetModel, type TranscribeResult } from 'parakeet.js';
import * as ort from 'onnxruntime-web';
import {
  categorizeManifestFile,
  downloadHfFileResumable,
  probeCachedModelFiles,
  takeBlobUrlBytes,
  type DownloadProgress,
} from './resumable-download';
import type {
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRLoadProgress,
  BrowserASRStatus,
  BrowserSegment,
  BrowserLanguageInfo,
  BrowserRecognizeResult,
  BrowserTranscribeResult,
} from './types';
import { DEFAULT_BROWSER_ASR_CONFIG, BROWSER_ASR_LANGUAGE_NAMES } from './types';
import { debugEnabled, installQuietAsrConsole } from './quiet-console';
import {
  LOAD_STALL_MS,
  SESSION_STALL_MS,
  describeSessionStall,
  describeStall,
  isSafariBrowser,
  startStallWatchdog,
} from './engine-load';

export { SESSION_STALL_MS };

installQuietAsrConsole();
silenceOrtSessionLogs();

/**
 * `parakeet.js` hardcodes `logSeverityLevel: 2` (Warning) for every session
 * it creates (see `node_modules/parakeet.js/src/parakeet.js`'s
 * `baseSessionOptions`) and exposes no way to override it through
 * `FromUrlsConfig` — so `ort.env.logLevel` alone does not silence
 * session-scoped warnings like "VerifyEachNodeIsAssignedToAnEp", since a
 * session's own `logSeverityLevel` wins over the environment default.
 *
 * This worker owns its own realm (a `Worker` is a separate JS environment,
 * so this is a different `onnxruntime-web` instance than the page's — see
 * `src/lib/diarization/browser/onnx-session.ts`), and `ParakeetModel`
 * resolves the *same* module this file imports (webpack's module cache is
 * per-realm, not per-import-site), so patching `create()` here reaches every
 * session `parakeet.js` creates.
 */
function silenceOrtSessionLogs(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    // Older/newer runtime without a settable log level — not worth failing over.
  }
  try {
    const Session = ort.InferenceSession as unknown as {
      create: (...args: unknown[]) => Promise<ort.InferenceSession>;
    };
    const original = Session.create.bind(Session);
    Session.create = (...args: unknown[]) => {
      const optionsIndex = 1;
      const existing = args[optionsIndex];
      args[optionsIndex] =
        existing && typeof existing === 'object'
          ? { ...(existing as object), logSeverityLevel: 3 }
          : { logSeverityLevel: 3 };
      return original(...args);
    };
  } catch {
    // Not worth failing model load over a logging tweak.
  }
}

/** Decoder state type from parakeet.js. */
type DecoderState = TranscribeResult['decoderState'];

/** Sample rate the engine is fed (see `Capture`); the warm-up uses the same. */
const SAMPLE_RATE = 16000;

/**
 * Length of the warm-up buffer: one second of silence.
 *
 * One second because that is the shortest window Parakeet's feature extractor
 * is meaningful on — a shorter buffer is not a cheaper warm-up, it is a
 * different (and possibly failing) inference.
 */
const WARMUP_SAMPLES = SAMPLE_RATE;

/** Counter for generating unique segment IDs. */
let segmentCounter = 0;
function nextSegmentId(): string {
  return `browser-${++segmentCounter}`;
}

/* ------------------------------------------------------------------ */
/* Resolving the model's files                                           */
/* ------------------------------------------------------------------ */

/** Exactly what `ParakeetModel.fromUrls` needs, minus the runtime options. */
interface ModelFileUrls {
  encoderUrl: string;
  decoderUrl: string;
  tokenizerUrl: string;
  /** Only for `preprocessorBackend: 'onnx'`; the JS preprocessor needs none. */
  preprocessorUrl?: string;
  encoderDataUrl?: string | null;
  decoderDataUrl?: string | null;
  /**
   * The graph filenames, which `fromUrls` needs only to tell ONNX Runtime
   * what the external-data file at `encoderDataUrl` should be called.
   */
  filenames: { encoder: string; decoder: string };
}

/**
 * Turn the manifest's file list into the URLs `fromUrls` wants.
 *
 * This is `getParakeetModel()`'s job, done from the manifest instead of from
 * the hub — and the manifest is a better source for it: `getParakeetModel`
 * had to fetch the repo's file listing over the network and then decide which
 * files exist, while `AsrModelManifest.files` already states exactly which
 * files this backend's variant is made of (including the external `.data`
 * blob, which is optional for `fromUrls` and load-bearing for the fp32
 * encoder).
 *
 * Each file is handed to the resumable downloader, which serves it from the
 * chunked cache when it is there and fetches it when it is not — so the load
 * path and the Download button share one cache and one validation, and the
 * reported bytes are this app's own rather than a third party's silence.
 * Sequentially, because two files' worth of bytes resident at once is peak
 * memory for nothing.
 */
async function resolveModelFileUrls(
  config: BrowserASRConfig,
  onProgress?: (p: DownloadProgress) => void,
): Promise<ModelFileUrls> {
  const urls: Partial<ModelFileUrls> & { filenames: { encoder: string; decoder: string } } = {
    filenames: { encoder: '', decoder: '' },
  };
  const unusable: string[] = [];

  for (const file of config.files) {
    const url = await downloadHfFileResumable(config.modelRepo, file, 'main', {
      onProgress,
      urlOverride: config.fileUrlOverrides?.[file],
    });
    switch (categorizeManifestFile(file)) {
      case 'encoder':
        urls.encoderUrl = url;
        urls.filenames.encoder = file;
        break;
      case 'encoderData':
        urls.encoderDataUrl = url;
        break;
      case 'decoder':
        urls.decoderUrl = url;
        urls.filenames.decoder = file;
        break;
      case 'decoderData':
        urls.decoderDataUrl = url;
        break;
      case 'tokenizer':
        urls.tokenizerUrl = url;
        break;
      case 'preprocessor':
        urls.preprocessorUrl = url;
        break;
      case 'joint':
      case 'jointData':
      case 'unknown':
        // Downloaded, but `fromUrls` has no slot for it. Released immediately
        // (a live `blob:` URL pins its bytes for the rest of the page's life —
        // see the memory notes on `_createModel`) and then reported rather than
        // silently ignored: a manifest that grew a file kind nothing knows
        // what to do with is a bug in the manifest, and the model would
        // otherwise load without whatever that file is for.
        URL.revokeObjectURL(url);
        unusable.push(file);
        break;
    }
  }

  if (unusable.length > 0) {
    throw new Error(
      `The model manifest lists ${unusable.join(', ')}, which cannot be used to build the model. ` +
        'This is a bug in the manifest, not something to work around.',
    );
  }
  if (!urls.encoderUrl || !urls.decoderUrl || !urls.tokenizerUrl) {
    throw new Error(
      `The model manifest is missing required files (have: ${config.files.join(', ')}).`,
    );
  }
  return urls as ModelFileUrls;
}

/**
 * Browser-native ASR engine using parakeet.js.
 *
 * Loads the NVIDIA Parakeet TDT 0.6B v3 ONNX model from this app's own
 * chunked IndexedDB cache — downloading whatever is not in it — using whichever
 * backend + quantisation `config` says (see `model-manifest.ts`: WebGPU gets
 * the self-built fp16 encoder, WASM gets the int8 one that actually fits in
 * wasm32 linear memory). This class does not pick that backend itself and does not
 * retry with a different one on failure — `browser-asr.ts` decides the backend
 * (via `detectAsrBackend()`/runtime fallback) and constructs the matching
 * config; this class just tries to load whatever it's given, once, and reports
 * success or failure.
 *
 * It does not use `parakeet.js`'s own file loader (`fromHub` /
 * `getParakeetModel`) at all: that one keeps its own cache of whole-file
 * Blobs, which is what WebKit refuses to write for a multi-gigabyte model.
 * See `_createModel` and `resumable-download.ts`.
 *
 * The model is lazy-loaded on first transcription request — never at page load.
 * There is no other transcription engine to fall back to (the app has no
 * server component): if the model fails to load, or the user disables
 * browser ASR, transcription simply doesn't run for that session.
 */
export class BrowserASREngine {
  private model: ParakeetModel | null = null;
  private config: BrowserASRConfig;
  private events: BrowserASREvents;
  private status: BrowserASRStatus = 'idle';
  private loadingPromise: Promise<void> | null = null;
  private isTranscribing = false;
  private segmentBuffer = '';
  private currentSegmentId = '';
  private decoderState: DecoderState = undefined;
  private languageLocked = false;

  constructor(config: Partial<BrowserASRConfig> = {}, events: BrowserASREvents) {
    this.config = { ...DEFAULT_BROWSER_ASR_CONFIG, ...config };
    this.events = events;
  }

  /** Current status of the browser ASR engine. */
  getStatus(): BrowserASRStatus {
    return this.status;
  }

  /**
   * Whether the model is loaded and ready for transcription.
   *
   * Still true while an inference runs. It used to be false then, and the
   * capture pipeline reads it per frame: a frame arriving mid-inference was
   * dropped, and it also kicked off `acquireEngine()`, which — once its cache
   * probe beat the inference — built and loaded a *second* model beside the
   * first. `browser-asr.ts` serialises inferences itself (`transcribeInFlight`).
   */
  get isReady(): boolean {
    return this.model !== null && (this.status === 'ready' || this.status === 'transcribing');
  }

  /**
   * Lazy-load the Parakeet model on first use.
   * Returns a cached promise if already loading.
   */
  async ensureLoaded(): Promise<void> {
    if (this.isReady) return;
    if (this.loadingPromise !== null) return this.loadingPromise;

    this.loadingPromise = this._loadModel();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Load the model's files (from the cache, or from the network) and create
   * the ONNX session for `config.backend`.
   *
   * `encoderQuant` is stated explicitly on the config rather than left to
   * `fromHub`'s default of `int8`: on a `webgpu*` backend, `parakeet.js`
   * silently force-upgrades that to `fp32` anyway (see `model-manifest.ts`) —
   * the manifests state their real quantisation (`fp16` on WebGPU, `int8`
   * on WASM) up front to keep the request honest about what's fetched.
   *
   * The three `onLoadProgress` milestones are all *measured*, never timed:
   * the cache probe counts files it actually opened, `fromUrls` resolving is
   * the only signal ORT gives that the sessions exist, and the warm-up is one
   * real inference. There is no timer here and none may be added — see
   * `model-progress.ts`.
   */
  private async _loadModel(): Promise<void> {
    this.status = 'loading';
    this.events.onStatusChange('loading');

    try {
      await this._readModelFiles();
      const model = await this._createModel();
      // Session creation has resolved, i.e. every ONNX session exists. That is
      // the only signal ORT gives — and it is a real one.
      this._reportLoadProgress({ stage: 'session', done: 1, total: 1 });
      this.model = model;
      // The warm-up is one real inference: a hang here is a hung session, not
      // a slow one, and without the race the load would sit short of `ready`
      // forever with the bar parked at its last stage.
      const warmupWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
      try {
        await Promise.race([this._warmUp(), warmupWatchdog.stall]);
      } finally {
        warmupWatchdog.dispose();
      }
      this.status = 'ready';
      this.events.onStatusChange('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.status = 'error';
      this.events.onStatusChange('error');
      // This is a *load* failure (session creation), never a download
      // failure: by the time this runs, every model file already downloaded
      // successfully (see resumable-download.ts / browser-asr-download-manager.ts,
      // which no longer construct a session themselves for exactly this
      // reason) — so "Download failed" would be actively wrong here.
      this.events.onError(`Could not start the model on this device: ${message}`);
      throw err;
    }
  }

  /**
   * Create the `ParakeetModel`, taking ownership of the model files.
   *
   * This is `fromHub()` — its exact two steps, resolving the file URLs and
   * then `ParakeetModel.fromUrls()` (see `parakeet.js`'s own `index.js`) —
   * done by hand, for two reasons.
   *
   * **The hub's own loader is not used at all.** `getParakeetModel()` resolves
   * URLs out of a cache it maintains itself, and that cache is a liability
   * here: it stores each file as one whole-file `Blob` (`store.put(blob)` in
   * its `hub.js`), which is precisely what WebKit refuses to write for a
   * multi-gigabyte model — "Error preparing Blob/File data to be stored in
   * object store" — and it has no way to be told to use ours instead. So the
   * URLs come from `resolveModelFileUrls()`, which reads this app's chunked
   * cache through the same downloader the Download button uses.
   *
    * **The URLs are ours to release.** `fromHub` takes the `blob:` URLs it gets
    * back and throws them away without revoking them. A live `blob:` URL pins
    * its Blob, so on the WASM path the 652 MB int8 encoder stayed resident for
    * the rest of the page's life *on top of* the copy ORT made inside the
    * session — and on the WebGPU path the same leak was the 1.24 GB fp16
    * blob. That duplication, on top of the sessions themselves, is what a
    * Safari WebContent process died trying to allocate (the tab reloads with
    * "a problem occurred" and nothing else survives).
   *
   * Holding the URLs ourselves costs nothing: `fromUrls()` has copied every
   * weight into the sessions by the time it resolves, so they are safe to
   * revoke immediately afterwards — including the external-data URL, which ORT
   * reads and materialises during `create()`.
   *
    * The downloader's progress and the two stall watchdogs cover the other way
    * this can go wrong. A file that is *not* cached is fetched here, inside the
    * load, and a multi-gigabyte transfer that reports nothing is the failure
    * that produced the frozen preparation bar: the bytes go into the load
    * progress as a real count, and silence past the resolve watchdog becomes a
    * stated error instead of a bar that stops moving forever. Session creation
    * itself reports nothing and is legitimately slow, so it runs under a
    * separate, generous watchdog that only catches a true hang.
   */
  private async _createModel(): Promise<ParakeetModel> {
    // Armed before the first byte is asked for, so a read that never produces
    // anything is caught by the same deadline as one that stops halfway.
    const resolveWatchdog = startStallWatchdog(LOAD_STALL_MS, describeStall);
    let urls: ModelFileUrls | null = null;
    try {
      try {
        urls = await Promise.race([
          resolveModelFileUrls(this.config, (p) => {
            resolveWatchdog.noteProgress();
            // Never reported with nothing to say: a `'fetch'` event with no bytes
            // behind it would render a "0 B" line where the honest answer is
            // "nothing is being fetched".
            if (p.loaded > 0) {
              this._reportLoadProgress({
                stage: 'fetch',
                done: 0,
                total: 0,
                loadedBytes: p.loaded,
                totalBytes: p.total,
                file: p.file,
              });
            }
          }),
          resolveWatchdog.stall,
        ]);
      } finally {
        resolveWatchdog.dispose();
      }
      // Session creation reports nothing while running and is legitimately
      // slow (minutes for the fp32 encoder), so it gets its own generous
      // silence deadline rather than the 45 s one: without any race a hang
      // here drops the watchdog rejection into `.catch(() => {})` and parks
      // the bar forever short of `ready` — the "stuck at 99%" failure.
      const sessionWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
      try {
        return await Promise.race([
          ParakeetModel.fromUrls({
            ...urls,
            // The graphs go in as bytes, not as their `blob:` URLs: WebKit
            // cannot fetch a multi-hundred-MB Blob (see `takeBlobUrlBytes`),
            // and `InferenceSession.create` takes a `Uint8Array` just as well.
            // `fromUrls` only passes these through to `create()`.
            encoderUrl: (takeBlobUrlBytes(urls.encoderUrl) ?? urls.encoderUrl) as unknown as string,
            decoderUrl: (takeBlobUrlBytes(urls.decoderUrl) ?? urls.decoderUrl) as unknown as string,
            backend: this.config.backend,
            preprocessorBackend: this.config.preprocessorBackend,
            // Single-threaded WASM on Safari: a pool buys nothing for one
            // utterance and costs memory per thread on the tab that died
            // from a peak. (`ort.env.wasm.proxy = false` is already what
            // `parakeet.js` sets for every backend.)
            ...(this.config.cpuThreads !== undefined
              ? { cpuThreads: this.config.cpuThreads }
              : isSafariBrowser()
                ? { cpuThreads: 1 }
                : {}),
          }),
          sessionWatchdog.stall,
        ]);
      } finally {
        sessionWatchdog.dispose();
      }
    } finally {
      // Stop the timer, and let go of the URLs: `fromUrls` has copied every
      // weight into the sessions by the time it resolves, so they are safe to
      // revoke immediately afterwards — including the external-data URL, which
      // ORT reads and materialises during `create()`. A live object URL pins its
      // Blob, which is the Safari tab-kill this method exists to avoid.
      for (const url of Object.values(urls ?? {})) {
        if (typeof url === 'string') takeBlobUrlBytes(url);
        // Only blob URLs are ours to revoke; `filenames` is not a URL and
        // `revokeObjectURL` on a non-URL is a harmless no-op anyway.
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    }
  }

  /** Report one load milestone, if anyone is listening for it. */
  private _reportLoadProgress(progress: BrowserASRLoadProgress): void {
    this.events.onLoadProgress?.(progress);
  }

  /**
   * The file stage: check the model's files against the cache, one by one.
   *
   * This is a *probe* — it reads one small record per file to confirm it is
   * there, and the bytes are read for real afterwards, when the URLs are
   * resolved. Both halves of the bar therefore have real denominators: the
   * count of files that are present, and the count of sessions that exist.
   */
  private async _readModelFiles(): Promise<void> {
    const files = this.config.files;
    if (files.length === 0) {
      // No file list (a hand-built config): the stage can't be counted, and
      // the progress layer reports that as indeterminate rather than guessing.
      return;
    }
    this._reportLoadProgress({ stage: 'files', done: 0, total: files.length });
    await probeCachedModelFiles(
      { modelRepo: this.config.modelRepo, files },
      ({ done, total }) => this._reportLoadProgress({ stage: 'files', done, total }),
    );
  }

  /**
   * The warm-up stage: run one real inference over a second of silence.
   *
   * This is a genuine warm-up, not a progress animation: the first inference
   * through an ORT session pays for shader/kernel compilation and allocator
   * warm-up, and doing it here means the first captured frame of a recording
   * doesn't. Its result is discarded and no events are emitted, so it cannot
   * produce a phantom segment, and the mel cache is reset afterwards so the
   * discarded features cannot leak into the first real frame.
   *
   * A failure here is deliberately *not* a load failure — the sessions exist,
   * and the real frames may well work. It only costs the progress bar its
   * final stage, so it is logged and the engine carries on.
   */
  private async _warmUp(): Promise<void> {
    if (!this.model) return;
    try {
      await this.model.transcribe(new Float32Array(WARMUP_SAMPLES), SAMPLE_RATE, {
        enableProfiling: false,
      });
      this.model.resetMelCache();
    } catch (err) {
      console.warn('[asr] Model warm-up did not complete; continuing without it', err);
      return;
    }
    this._reportLoadProgress({ stage: 'warmup', done: 1, total: 1 });
  }

  /**
   * Transcribe an audio buffer and emit segment updates.
   */
  async transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult> {
    await this.ensureLoaded();
    if (!this.model || this.status !== 'ready') {
      return { segments: [], language: null, error: 'Model not ready' };
    }

    this.isTranscribing = true;
    this.status = 'transcribing';
    this.events.onStatusChange('transcribing');

    try {
      const result = await this.model.transcribe(audio, SAMPLE_RATE, {
        previousDecoderState: this.decoderState,
        returnDecoderState: true,
        returnTimestamps: true,
        timeOffset: 0,
        // Profiling is on by default in parakeet.js and prints an RTF line plus
        // a console.table for every inference — every two seconds while live.
        enableProfiling: false,
      });

      this.decoderState = result.decoderState;

      const segments = this._buildSegments(result, source, speakerLabel, isFinal);
      const language = this._buildLanguageInfo();

      for (const seg of segments) {
        this.events.onSegment(seg);
      }

      return { segments, language, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { segments: [], language: null, error: message };
    } finally {
      this.isTranscribing = false;
      this.status = 'ready';
      this.events.onStatusChange('ready');
    }
  }

  /**
   * Recognise one window on its own: its words with times, no decoder state
   * carried in or out and no segment events. The live path re-reads the open
   * utterance with this and builds segments itself (`live-chunker.ts`).
   *
   * No status events either: it runs every second or so per source, and each
   * one would re-render every subscriber on the page for nothing.
   */
  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    await this.ensureLoaded();
    if (!this.model || !this.isReady) {
      return { text: '', words: [], error: 'Model not ready' };
    }
    try {
      const debug = debugEnabled();
      const result = await this.model.transcribe(audio, SAMPLE_RATE, {
        returnTimestamps: true,
        // Per-word confidence lets the live path drop what the model only
        // guessed at out of a click or a breath (`speech-gate.ts`).
        returnConfidences: true,
        enableProfiling: debug,
      });
      if (debug) console.debug('[asr-latency] metrics', result.metrics);
      const words = (result.words ?? []).map((w) => ({
        text: w.text,
        start: w.start_time,
        end: w.end_time,
        ...(typeof w.confidence === 'number' ? { confidence: w.confidence } : {}),
      }));
      return { text: result.utterance_text.trim(), words, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { text: '', words: [], error: message };
    }
  }

  /**
   * End the current session: drop everything that belongs to it, keep the
   * model.
   *
   * The model is deliberately *not* dropped. `parakeet.js` 1.4.4 exposes no
   * `release()` for its ONNX sessions, so nulling `this.model` handed ~670 MB
   * (WASM int8) or several GB (WebGPU fp32) back only to whatever the GC felt
   * like doing — and the next `ensureLoaded()` built a second copy while the
   * first was often still alive. On Safari that peak is what killed the
   * WebContent process. Keeping one loaded model per page is the smaller
   * steady state, and it makes the next Record instant instead of another
   * multi-gigabyte load.
   *
   * `disable()` is the real teardown.
   */
  async stop(): Promise<void> {
    this.decoderState = undefined;
    this.segmentBuffer = '';
    this.currentSegmentId = '';
    this.status = this.model ? 'ready' : 'idle';
    this.events.onStatusChange(this.status);
    segmentCounter = 0;
  }

  /**
   * Disable browser ASR and release the model. This is the only path that
   * lets the sessions go.
   */
  disable(): void {
    this.model = null;
    this.decoderState = undefined;
    this.status = 'disabled';
    this.loadingPromise = null;
    this.events.onStatusChange('disabled');
  }

  /**
   * Build BrowserSegment[] from a TranscribeResult.
   */
  private _buildSegments(
    result: TranscribeResult,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): BrowserSegment[] {
    const text = result.utterance_text.trim();
    if (!text && !this.segmentBuffer) return [];

    this.segmentBuffer += ' ' + text;
    const fullText = this.segmentBuffer.trim();

    if (!this.currentSegmentId) {
      this.currentSegmentId = nextSegmentId();
    }

    const nowSec = result.metrics ? result.metrics.total_ms / 1000 : 0;

    const seg: BrowserSegment = {
      id: this.currentSegmentId,
      source,
      speaker: speakerLabel,
      text: fullText,
      start: nowSec - fullText.length * 0.05,
      end: nowSec,
      final: isFinal,
    };
    if (result.words?.length) {
      seg.words = result.words.map((w) => ({ text: w.text, start: w.start_time, end: w.end_time }));
    }

    if (isFinal) {
      this.segmentBuffer = '';
      this.currentSegmentId = '';
    }

    return [seg];
  }

  /**
   * Build BrowserLanguageInfo from a TranscribeResult.
   */
  private _buildLanguageInfo(): BrowserLanguageInfo | null {
    if (this.languageLocked) {
      return {
        code: this.config.language,
        name: BROWSER_ASR_LANGUAGE_NAMES[this.config.language] ?? this.config.language,
        locked: true,
        confidence: 1.0,
      };
    }
    return {
      code: this.config.language,
      name: BROWSER_ASR_LANGUAGE_NAMES[this.config.language] ?? this.config.language,
      locked: false,
      confidence: 0.5,
    };
  }

  /** Lock the detected language. */
  lockLanguage(): void {
    this.languageLocked = true;
  }

  /** Unlock language for re-detection. */
  unlockLanguage(): void {
    this.languageLocked = false;
  }
}
