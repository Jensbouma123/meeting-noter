/** The speech engine the meeting pipeline talks to — the parakeet.js model,
 *  running in a dedicated worker (`engine-worker.ts`) whenever the page can
 *  host one.
 *
 *  On the page, the model's work was the main-thread blocker: ORT's WASM
 *  backend runs each `session.run` synchronously (parakeet.js sets
 *  `ort.env.wasm.proxy = false`), so every post-stop chunk froze the UI for
 *  tens of seconds, and even on WebGPU the JS mel preprocessor, the decoder
 *  loop and session creation all ran between frames. Same pattern as
 *  `src/lib/langid/index.ts`: the worker owns the ONNX sessions, the page
 *  only posts audio and receives segments.
 *
 *  The worker holds the one copy of the model, never the page as well. It
 *  reads the files out of the same IndexedDB cache through the same
 *  downloader (cross-context coordination is the downloader's own
 *  `BroadcastChannel`), and the page's copy of each audio window is
 *  transferred, not shared.
 *
 *  Falls back to running the engine on the page — the previous behaviour —
 *  when there is no `Worker` (tests, SSR), when the worker fails to start, or
 *  when the configured backend needs WebGPU and the worker scope has none
 *  (WebGPU in workers shipped later than on the page in some browsers; the
 *  page's adapter probe says nothing about the worker's). */
import { createLocalAsrEngine, type LocalAsrEngine } from './engine-factory';
import { isSafariEngine } from './backend-detect';
import { debugEnabled } from './quiet-console';
import type { EngineCall, EngineWorkerIn, EngineWorkerOut } from './engine-protocol';
import type {
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRStatus,
  BrowserRecognizeResult,
  BrowserTranscribeResult,
} from './types';

/** What the meeting pipeline uses of an engine — `BrowserASREngine`'s surface. */
export interface AsrEngine {
  readonly isReady: boolean;
  getStatus(): BrowserASRStatus;
  ensureLoaded(): Promise<void>;
  transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult>;
  /** One window's words, nothing carried over (see `BrowserASREngine.recognize`). */
  recognize(audio: Float32Array): Promise<BrowserRecognizeResult>;
  stop(): Promise<void>;
  disable(): void;
  lockLanguage(): void;
  unlockLanguage(): void;
}

/**
 * How long the worker may take to evaluate its module before the engine runs
 * on the page instead. Starting it fetches one script chunk; the model itself
 * loads later, under the engine's own stall watchdogs.
 */
const WORKER_START_TIMEOUT_MS = 30_000;

/** The in-thread engine's answer when there is no model to run. */
const NOT_READY: BrowserTranscribeResult = { segments: [], language: null, error: 'Model not ready' };
const NOT_READY_WORDS: BrowserRecognizeResult = { text: '', words: [], error: 'Model not ready' };

/** What a call settles with when there is no model to run it. */
function notReady(method: EngineCall['method']): BrowserTranscribeResult | BrowserRecognizeResult | undefined {
  if (method === 'transcribe') return NOT_READY;
  if (method === 'recognize') return NOT_READY_WORDS;
  return undefined;
}

/** Build the engine for `config`: in a worker when possible, else on the page. */
export function createBrowserASREngine(config: BrowserASRConfig, events: BrowserASREvents): AsrEngine {
  if (typeof Worker === 'undefined') return createLocalAsrEngine(config, events);
  return new WorkerBrowserASREngine(config, events);
}

interface PendingCall {
  method: EngineCall['method'];
  resolve: (value: BrowserTranscribeResult | BrowserRecognizeResult | undefined) => void;
  reject: (err: Error) => void;
}

class WorkerBrowserASREngine implements AsrEngine {
  private readonly config: BrowserASRConfig;
  private readonly events: BrowserASREvents;
  /** Set when the engine runs on the page instead (see the module comment). */
  private local: LocalAsrEngine | null = null;
  private worker: Worker | null = null;
  private connecting: Promise<LocalAsrEngine | null> | null = null;
  /** Mirrors of the worker engine's state, updated by every status message
   *  and reply, so `isReady` stays synchronous for the per-frame checks. */
  private status: BrowserASRStatus = 'idle';
  private ready = false;
  private disabled = false;
  private languageLocked = false;
  /** Why the worker went away, once it has crashed. */
  private crashed: string | null = null;
  private nextCallId = 0;
  private readonly pending = new Map<number, PendingCall>();

  constructor(config: BrowserASRConfig, events: BrowserASREvents) {
    this.config = config;
    this.events = events;
  }

  get isReady(): boolean {
    return this.local ? this.local.isReady : this.ready;
  }

  getStatus(): BrowserASRStatus {
    return this.local ? this.local.getStatus() : this.status;
  }

  async ensureLoaded(): Promise<void> {
    const local = await this.connect();
    if (local) return local.ensureLoaded();
    await this.call({ method: 'ensureLoaded' });
  }

  async transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult> {
    const local = await this.connect();
    if (local) return local.transcribe(audio, source, speakerLabel, isFinal);
    // A copy, transferred: callers keep using their window (the speaker
    // labeler has already read it), and the worker gets its own without a
    // structured-clone copy on top.
    const copy = audio.slice();
    try {
      const result = await this.call(
        { method: 'transcribe', args: { audio: copy, source, speakerLabel, isFinal } },
        [copy.buffer],
      );
      return (result as BrowserTranscribeResult | undefined) ?? NOT_READY;
    } catch (err) {
      // Only a dead worker gets here — the engine itself reports inference
      // failures as a result, and so does this.
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { segments: [], language: null, error: message };
    }
  }

  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    const local = await this.connect();
    if (local) return local.recognize(audio);
    const copy = audio.slice();
    try {
      const result = await this.call({ method: 'recognize', args: { audio: copy } }, [copy.buffer]);
      return (result as BrowserRecognizeResult | undefined) ?? NOT_READY_WORDS;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { text: '', words: [], error: message };
    }
  }

  async stop(): Promise<void> {
    if (this.local) return this.local.stop();
    if (!this.worker) {
      // Nothing was ever loaded: exactly what the in-thread engine does then.
      this.status = this.disabled ? this.status : 'idle';
      this.events.onStatusChange(this.status);
      return;
    }
    await this.call({ method: 'stop' }).catch(() => undefined);
  }

  /** The real teardown: terminating the worker returns the sessions' memory,
   *  which parakeet.js 1.4.4 cannot do on its own. */
  disable(): void {
    this.disabled = true;
    if (this.local) {
      this.local.disable();
      return;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.status = 'disabled';
    // Settle what was in flight the way a disabled in-thread engine would:
    // a load that no longer matters, an inference with no model.
    for (const call of this.pending.values()) {
      call.resolve(notReady(call.method));
    }
    this.pending.clear();
    this.events.onStatusChange('disabled');
  }

  lockLanguage(): void {
    this.languageLocked = true;
    if (this.local) this.local.lockLanguage();
    else if (this.worker) void this.call({ method: 'lockLanguage' }).catch(() => undefined);
  }

  unlockLanguage(): void {
    this.languageLocked = false;
    if (this.local) this.local.unlockLanguage();
    else if (this.worker) void this.call({ method: 'unlockLanguage' }).catch(() => undefined);
  }

  /* ---------------------------------------------------------------- */

  /** Resolve to the in-thread engine, or `null` once the worker is up. */
  private connect(): Promise<LocalAsrEngine | null> {
    if (!this.connecting) this.connecting = this.start();
    return this.connecting;
  }

  private async start(): Promise<LocalAsrEngine | null> {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      console.warn('[asr] Could not start the speech model worker; running it on the page', err);
      return this.runOnPage();
    }

    const hello = await new Promise<{ webgpu: boolean } | null>((resolve) => {
      const timer = setTimeout(() => finish(null), WORKER_START_TIMEOUT_MS);
      const onMessage = (event: MessageEvent<EngineWorkerOut>) => {
        if (event.data?.type === 'hello') finish({ webgpu: event.data.webgpu });
      };
      const onError = (event: Event) => {
        event.preventDefault?.();
        finish(null);
      };
      function finish(value: { webgpu: boolean } | null) {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        resolve(value);
      }
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
    });

    if (this.disabled) {
      worker.terminate();
      return null;
    }
    if (hello === null) {
      worker.terminate();
      console.warn('[asr] The speech model worker did not start; running it on the page');
      return this.runOnPage();
    }
    if (this.config.backend !== 'wasm' && !hello.webgpu) {
      worker.terminate();
      return this.runOnPage();
    }

    this.worker = worker;
    worker.onmessage = (event: MessageEvent<EngineWorkerOut>) => this.onMessage(event.data);
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.onCrash(event.message || 'The speech model worker stopped');
    };
    worker.onmessageerror = () => this.onCrash('The speech model worker sent an unreadable message');
    // Safari is recognised here, not in the worker: `navigator.vendor` is
    // Window-only, so the engine's own check cannot see it there.
    const config: BrowserASRConfig =
      this.config.cpuThreads === undefined && isSafariEngine() ? { ...this.config, cpuThreads: 1 } : this.config;
    this.post({ type: 'init', config, debug: debugEnabled() });
    if (this.languageLocked) void this.call({ method: 'lockLanguage' }).catch(() => undefined);
    return null;
  }

  private runOnPage(): LocalAsrEngine {
    const engine = createLocalAsrEngine(this.config, this.events);
    if (this.languageLocked) engine.lockLanguage();
    this.local = engine;
    return engine;
  }

  private post(message: EngineWorkerIn, transfer: Transferable[] = []): void {
    this.worker?.postMessage(message, transfer);
  }

  private call(
    call: EngineCall,
    transfer: Transferable[] = [],
  ): Promise<BrowserTranscribeResult | BrowserRecognizeResult | undefined> {
    if (this.disabled) return Promise.resolve(notReady(call.method));
    if (!this.worker) {
      return Promise.reject(new Error(this.crashed ?? 'The speech model worker is not running'));
    }
    const callId = ++this.nextCallId;
    return new Promise((resolve, reject) => {
      this.pending.set(callId, { method: call.method, resolve, reject });
      this.post({ type: 'call', callId, ...call }, transfer);
    });
  }

  private onMessage(msg: EngineWorkerOut): void {
    if (this.disabled || !msg) return;
    switch (msg.type) {
      case 'status':
        this.status = msg.status;
        this.ready = msg.ready;
        this.events.onStatusChange(msg.status);
        return;
      case 'segment':
        this.events.onSegment(msg.segment);
        return;
      case 'language':
        this.events.onLanguage(msg.language);
        return;
      case 'error':
        this.events.onError(msg.message);
        return;
      case 'loadProgress':
        this.events.onLoadProgress?.(msg.progress);
        return;
      case 'reply': {
        this.ready = msg.ready;
        const call = this.pending.get(msg.callId);
        if (!call) return;
        this.pending.delete(msg.callId);
        if (msg.ok) call.resolve(msg.value);
        else call.reject(new Error(msg.error ?? 'Unknown speech model error'));
        return;
      }
    }
  }

  /** The worker died (most likely out of memory): fail what was in flight
   *  exactly as a failed session creation or inference would. */
  private onCrash(message: string): void {
    if (this.disabled) return;
    this.crashed = message;
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.status = 'error';
    const inFlight = [...this.pending.values()];
    this.pending.clear();
    this.events.onStatusChange('error');
    for (const call of inFlight) call.reject(new Error(message));
  }
}
