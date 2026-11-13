import type * as Ort from 'onnxruntime-web';
import { probeCachedModelFiles, downloadHfFileResumable, takeBlobUrlBytes, type DownloadProgress } from './resumable-download';
import {
  LOAD_STALL_MS,
  SESSION_STALL_MS,
  describeSessionStall,
  describeStall,
  isSafariBrowser,
  startStallWatchdog,
} from './engine-load';
import {
  NEMOTRON,
  NemotronRecognizer,
  nemotronLangId,
  parseNemotronVocab,
  type NemotronSessions,
  type OrtLike,
} from './nemotron-core';
import type {
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRLoadProgress,
  BrowserASRStatus,
  BrowserLanguageInfo,
  BrowserRecognizeResult,
  BrowserSegment,
  BrowserTranscribeResult,
} from './types';
import { DEFAULT_BROWSER_ASR_CONFIG } from './constants';
import { installQuietAsrConsole } from './quiet-console';
import { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';

installQuietAsrConsole();

let segmentCounter = 0;
function nextSegmentId(): string {
  return `browser-nemotron-${++segmentCounter}`;
}

const GRAPHS = ['encoder', 'decoder', 'joint'] as const;
type Graph = (typeof GRAPHS)[number];

async function bytesOf(url: string): Promise<Uint8Array> {
  const held = takeBlobUrlBytes(url);
  if (held) return held;
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

const PROMPT_LANG_ID = nemotronLangId('auto');

export class NemotronASREngine {
  private recognizer: NemotronRecognizer | null = null;
  private config: BrowserASRConfig;
  private events: BrowserASREvents;
  private status: BrowserASRStatus = 'idle';
  private loadingPromise: Promise<void> | null = null;
  private segmentBuffer = '';
  private currentSegmentId = '';
  private languageLocked = false;

  private languageHint: string | null = null;

  private queue: Promise<unknown> = Promise.resolve();
  private readonly vocabulary = new BiaserSlot();

  constructor(config: Partial<BrowserASRConfig> = {}, events: BrowserASREvents) {
    this.config = { ...DEFAULT_BROWSER_ASR_CONFIG, ...config };
    this.events = events;
  }

  getStatus(): BrowserASRStatus {
    return this.status;
  }

  get isReady(): boolean {
    return this.recognizer !== null && (this.status === 'ready' || this.status === 'transcribing');
  }

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

  private async _loadModel(): Promise<void> {
    this.status = 'loading';
    this.events.onStatusChange('loading');
    try {
      await this._readModelFiles();
      const recognizer = await this._createRecognizer();
      this._reportLoadProgress({ stage: 'session', done: 1, total: 1 });
      this.recognizer = recognizer;
      this.vocabulary.setVocab(recognizer.pieces);
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
      this.events.onError(`Could not start the model on this device: ${message}`);
      throw err;
    }
  }

  private _reportLoadProgress(progress: BrowserASRLoadProgress): void {
    this.events.onLoadProgress?.(progress);
  }

  private async _readModelFiles(): Promise<void> {
    const files = this.config.files;
    if (files.length === 0) return;
    this._reportLoadProgress({ stage: 'files', done: 0, total: files.length });
    await probeCachedModelFiles({ modelRepo: this.config.modelRepo, files }, ({ done, total }) =>
      this._reportLoadProgress({ stage: 'files', done, total }),
    );
  }

  private async _createRecognizer(): Promise<NemotronRecognizer> {
    const resolveWatchdog = startStallWatchdog(LOAD_STALL_MS, describeStall);
    const urls = new Map<string, string>();
    try {
      try {
        await Promise.race([
          (async () => {
            for (const file of this.config.files) {
              const url = await downloadHfFileResumable(this.config.modelRepo, file, 'main', {
                onProgress: (p: DownloadProgress) => {
                  resolveWatchdog.noteProgress();
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
                },
                urlOverride: this.config.fileUrlOverrides?.[file],
              });
              urls.set(file, url);
              resolveWatchdog.noteProgress();
            }
          })(),
          resolveWatchdog.stall,
        ]);
      } finally {
        resolveWatchdog.dispose();
      }
      const missing = [...GRAPHS.map((g) => `${g}.onnx`), 'vocab.txt'].filter((f) => !urls.has(f));
      if (missing.length > 0) {
        throw new Error(`The model manifest is missing required files (${missing.join(', ')}).`);
      }

      const vocab = parseNemotronVocab(new TextDecoder().decode(await bytesOf(urls.get('vocab.txt') as string)));
      if (vocab.length !== NEMOTRON.vocabSize) {
        throw new Error(`vocab.txt has ${vocab.length} entries, the model expects ${NEMOTRON.vocabSize}.`);
      }

      const sessionWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
      try {
        const sessions = await Promise.race([this._createSessions(urls), sessionWatchdog.stall]);
        const ort = (await import('onnxruntime-web')) as unknown as OrtLike;
        return new NemotronRecognizer(ort, sessions, vocab);
      } finally {
        sessionWatchdog.dispose();
      }
    } finally {
      for (const url of urls.values()) {
        takeBlobUrlBytes(url);
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
    }
  }

  private async _createSessions(urls: Map<string, string>): Promise<NemotronSessions> {
    const ort = (await import('onnxruntime-web')) as typeof Ort;
    configureOrt(ort, this.config);
    const onGpu = this.config.asrBackend === 'webgpu';
    const sessions: Partial<Record<Graph, Ort.InferenceSession>> = {};
    for (const graph of GRAPHS) {
      const model = await bytesOf(urls.get(`${graph}.onnx`) as string);
      const dataUrl = urls.get(`${graph}.onnx.data`);
      const externalData = dataUrl ? [{ path: `${graph}.onnx.data`, data: await bytesOf(dataUrl) }] : undefined;
      sessions[graph] = await ort.InferenceSession.create(model, {
        executionProviders: graph === 'encoder' && onGpu ? ['webgpu'] : ['wasm'],
        graphOptimizationLevel: 'all',
        logSeverityLevel: 3,
        ...(externalData ? { externalData } : {}),
      });
    }
    return sessions as unknown as NemotronSessions;
  }

  private async _warmUp(): Promise<void> {
    if (!this.recognizer) return;
    try {
      await this._serial(() =>
        (this.recognizer as NemotronRecognizer).recognize(new Float32Array(NEMOTRON.chunkSamples), {
          langId: PROMPT_LANG_ID,
          flushChunks: 0,
        }),
      );
    } catch (err) {
      console.warn('[asr] Model warm-up did not complete; continuing without it', err);
      return;
    }
    this._reportLoadProgress({ stage: 'warmup', done: 1, total: 1 });
  }

  private _serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult> {
    await this.ensureLoaded();
    const recognizer = this.recognizer;
    if (!recognizer || this.status !== 'ready') {
      return { segments: [], language: null, error: 'Model not ready' };
    }
    this.status = 'transcribing';
    this.events.onStatusChange('transcribing');
    try {
      const result = await this._serial(() => recognizer.recognize(audio, { langId: this._langId(), biaser: this.vocabulary.get() }));
      const segments = this._buildSegments(result.text, result.words, audio.length, source, speakerLabel, isFinal);
      for (const seg of segments) this.events.onSegment(seg);
      return { segments, language: this._buildLanguageInfo(), error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { segments: [], language: null, error: message };
    } finally {
      this.status = 'ready';
      this.events.onStatusChange('ready');
    }
  }

  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    await this.ensureLoaded();
    const recognizer = this.recognizer;
    if (!recognizer || !this.isReady) return { text: '', words: [], error: 'Model not ready' };
    try {
      const result = await this._serial(() => recognizer.recognize(audio, { langId: this._langId(), biaser: this.vocabulary.get() }));
      return { text: result.text, words: result.words, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.events.onError(`Browser ASR transcription error: ${message}`);
      return { text: '', words: [], error: message };
    }
  }

  async stop(): Promise<void> {
    this.segmentBuffer = '';
    this.currentSegmentId = '';
    this.status = this.recognizer ? 'ready' : 'idle';
    this.events.onStatusChange(this.status);
    segmentCounter = 0;
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary.setWords(config.words, config.strength);
  }

  disable(): void {
    this.recognizer = null;
    this.vocabulary.setVocab(null);
    this.status = 'disabled';
    this.loadingPromise = null;
    this.events.onStatusChange('disabled');
  }

  setLanguageHint(code: string | null): void {
    this.languageHint = code;
  }

  private _langId(): number {
    return nemotronLangId(this.languageHint ?? 'auto');
  }

  lockLanguage(): void {
    this.languageLocked = true;
  }

  unlockLanguage(): void {
    this.languageLocked = false;
  }

  private _buildSegments(
    text: string,
    words: BrowserRecognizeResult['words'],
    samples: number,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): BrowserSegment[] {
    if (!text && !this.segmentBuffer) return [];
    this.segmentBuffer = `${this.segmentBuffer} ${text}`.trim();
    if (!this.currentSegmentId) this.currentSegmentId = nextSegmentId();
    const seg: BrowserSegment = {
      id: this.currentSegmentId,
      source,
      speaker: speakerLabel,
      text: this.segmentBuffer,
      start: words.length > 0 ? words[0].start : 0,
      end: words.length > 0 ? words[words.length - 1].end : samples / NEMOTRON.sampleRate,
      final: isFinal,
    };
    if (words.length > 0) seg.words = words.map((w) => ({ text: w.text, start: w.start, end: w.end }));
    if (isFinal) {
      this.segmentBuffer = '';
      this.currentSegmentId = '';
    }
    return [seg];
  }

  private _buildLanguageInfo(): BrowserLanguageInfo {
    return {
      code: this.config.language,
      name: this.config.language,
      locked: this.languageLocked,
      confidence: this.languageLocked ? 1 : 0.5,
    };
  }
}

function configureOrt(ort: typeof Ort, config: BrowserASRConfig): void {
  try {
    ort.env.logLevel = 'error';
  } catch {

  }
  if (!ort.env.wasm.wasmPaths) {
    const version = ort.env.versions?.common ?? '1.24.1';
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;
  }
  const threaded = typeof SharedArrayBuffer !== 'undefined';
  const wanted = config.cpuThreads ?? (isSafariBrowser() ? 1 : Math.min(4, globalThis.navigator?.hardwareConcurrency ?? 4));
  ort.env.wasm.numThreads = threaded ? wanted : 1;
  ort.env.wasm.proxy = false;
}
