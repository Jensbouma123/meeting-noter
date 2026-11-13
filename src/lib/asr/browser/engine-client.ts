import { createLocalAsrEngine, type LocalAsrEngine } from './engine-factory';
import { isSafariEngine } from './is-safari-engine';
import { debugEnabled } from './quiet-console';
import type { EngineCall, EngineWorkerIn, EngineWorkerOut } from './engine-protocol';
import { getAsrLanguageHint, subscribeAsrLanguageHint } from './language-hint';
import { getVocabularyBiasConfig, subscribeVocabulary } from '@/lib/vocabulary/store';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import type {
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRStatus,
  BrowserRecognizeResult,
  BrowserTranscribeResult,
} from './types';

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

  recognize(audio: Float32Array): Promise<BrowserRecognizeResult>;
  stop(): Promise<void>;
  disable(): void;
  lockLanguage(): void;
  unlockLanguage(): void;

  setLanguageHint(code: string | null): void;

  setVocabulary(config: VocabularyBiasConfig): void;
}

const WORKER_START_TIMEOUT_MS = 30_000;

const NOT_READY: BrowserTranscribeResult = { segments: [], language: null, error: 'Model not ready' };
const NOT_READY_WORDS: BrowserRecognizeResult = { text: '', words: [], error: 'Model not ready' };

function notReady(method: EngineCall['method']): BrowserTranscribeResult | BrowserRecognizeResult | undefined {
  if (method === 'transcribe') return NOT_READY;
  if (method === 'recognize') return NOT_READY_WORDS;
  return undefined;
}

export function createBrowserASREngine(config: BrowserASRConfig, events: BrowserASREvents): AsrEngine {
  if (typeof Worker === 'undefined') {
    const engine = createLocalAsrEngine(config, events);
    const vocabulary = getVocabularyBiasConfig();
    if (vocabulary.words.length > 0) engine.setVocabulary(vocabulary);
    return engine;
  }
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

  private local: LocalAsrEngine | null = null;
  private worker: Worker | null = null;
  private connecting: Promise<LocalAsrEngine | null> | null = null;

  private status: BrowserASRStatus = 'idle';
  private ready = false;
  private disabled = false;
  private languageLocked = false;

  private vocabulary: VocabularyBiasConfig = getVocabularyBiasConfig();
  private readonly unfollowVocabulary: () => void;
  private languageHint: string | null = getAsrLanguageHint();
  private readonly unfollowLanguageHint: () => void;

  private crashed: string | null = null;
  private nextCallId = 0;
  private readonly pending = new Map<number, PendingCall>();

  constructor(config: BrowserASRConfig, events: BrowserASREvents) {
    this.config = config;
    this.events = events;
    this.unfollowVocabulary = subscribeVocabulary(() => this.setVocabulary(getVocabularyBiasConfig()));
    this.unfollowLanguageHint = subscribeAsrLanguageHint(() => this.setLanguageHint(getAsrLanguageHint()));
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

    const copy = audio.slice();
    try {
      const result = await this.call(
        { method: 'transcribe', args: { audio: copy, source, speakerLabel, isFinal } },
        [copy.buffer],
      );
      return (result as BrowserTranscribeResult | undefined) ?? NOT_READY;
    } catch (err) {

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

      this.status = this.disabled ? this.status : 'idle';
      this.events.onStatusChange(this.status);
      return;
    }
    await this.call({ method: 'stop' }).catch(() => undefined);
  }

  disable(): void {
    this.disabled = true;
    this.unfollowVocabulary();
    this.unfollowLanguageHint();
    if (this.local) {
      this.local.disable();
      return;
    }
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.status = 'disabled';

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

  setLanguageHint(code: string | null): void {
    this.languageHint = code;
    if (this.local) this.local.setLanguageHint(code);
    else if (this.worker) void this.call({ method: 'setLanguageHint', args: { code } }).catch(() => undefined);
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary = config;
    if (this.local) this.local.setVocabulary(config);
    else if (this.worker) void this.call({ method: 'setVocabulary', args: config }).catch(() => undefined);
  }

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

    const config: BrowserASRConfig =
      this.config.cpuThreads === undefined && isSafariEngine() ? { ...this.config, cpuThreads: 1 } : this.config;
    this.post({ type: 'init', config, debug: debugEnabled() });
    if (this.languageLocked) void this.call({ method: 'lockLanguage' }).catch(() => undefined);
    if (this.languageHint) void this.call({ method: 'setLanguageHint', args: { code: this.languageHint } }).catch(() => undefined);
    if (this.vocabulary.words.length > 0) {
      void this.call({ method: 'setVocabulary', args: this.vocabulary }).catch(() => undefined);
    }
    return null;
  }

  private runOnPage(): LocalAsrEngine {
    const engine = createLocalAsrEngine(this.config, this.events);
    if (this.languageLocked) engine.lockLanguage();
    if (this.languageHint) engine.setLanguageHint(this.languageHint);
    if (this.vocabulary.words.length > 0) engine.setVocabulary(this.vocabulary);
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
