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
import { DEFAULT_BROWSER_ASR_CONFIG, BROWSER_ASR_LANGUAGE_NAMES } from './constants';
import { debugEnabled, installQuietAsrConsole } from './quiet-console';
import { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import { canHookParakeet, hookParakeetVocabulary, type HookableParakeetModel } from './vocabulary-hook';
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

function silenceOrtSessionLogs(): void {
  try {
    ort.env.logLevel = 'error';
  } catch {

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

  }
}

type DecoderState = TranscribeResult['decoderState'];

const SAMPLE_RATE = 16000;

const WARMUP_SAMPLES = SAMPLE_RATE;

let segmentCounter = 0;
function nextSegmentId(): string {
  return `browser-${++segmentCounter}`;
}

interface ModelFileUrls {
  encoderUrl: string;
  decoderUrl: string;
  tokenizerUrl: string;

  preprocessorUrl?: string;
  encoderDataUrl?: string | null;
  decoderDataUrl?: string | null;

  filenames: { encoder: string; decoder: string };
}

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
  private readonly vocabulary = new BiaserSlot();

  constructor(config: Partial<BrowserASRConfig> = {}, events: BrowserASREvents) {
    this.config = { ...DEFAULT_BROWSER_ASR_CONFIG, ...config };
    this.events = events;
  }

  getStatus(): BrowserASRStatus {
    return this.status;
  }

  get isReady(): boolean {
    return this.model !== null && (this.status === 'ready' || this.status === 'transcribing');
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
      const model = await this._createModel();

      this._reportLoadProgress({ stage: 'session', done: 1, total: 1 });
      this.model = model;
      const hookable = model as unknown as Partial<HookableParakeetModel>;
      if (canHookParakeet(hookable)) {
        hookParakeetVocabulary(hookable, () => this.vocabulary.get());
        this.vocabulary.setVocab(hookable.tokenizer.id2token);
      } else {

        console.warn('[asr] This parakeet.js has no decoder step to hook; the word list only fixes spelling afterwards');
      }

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

  private async _createModel(): Promise<ParakeetModel> {

    const resolveWatchdog = startStallWatchdog(LOAD_STALL_MS, describeStall);
    let urls: ModelFileUrls | null = null;
    try {
      try {
        urls = await Promise.race([
          resolveModelFileUrls(this.config, (p) => {
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
          }),
          resolveWatchdog.stall,
        ]);
      } finally {
        resolveWatchdog.dispose();
      }

      const sessionWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
      try {
        return await Promise.race([
          ParakeetModel.fromUrls({
            ...urls,

            encoderUrl: (takeBlobUrlBytes(urls.encoderUrl) ?? urls.encoderUrl) as unknown as string,
            decoderUrl: (takeBlobUrlBytes(urls.decoderUrl) ?? urls.decoderUrl) as unknown as string,
            backend: this.config.backend,
            preprocessorBackend: this.config.preprocessorBackend,

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

      for (const url of Object.values(urls ?? {})) {
        if (typeof url === 'string') takeBlobUrlBytes(url);

        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    }
  }

  private _reportLoadProgress(progress: BrowserASRLoadProgress): void {
    this.events.onLoadProgress?.(progress);
  }

  private async _readModelFiles(): Promise<void> {
    const files = this.config.files;
    if (files.length === 0) {

      return;
    }
    this._reportLoadProgress({ stage: 'files', done: 0, total: files.length });
    await probeCachedModelFiles(
      { modelRepo: this.config.modelRepo, files },
      ({ done, total }) => this._reportLoadProgress({ stage: 'files', done, total }),
    );
  }

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

  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    await this.ensureLoaded();
    if (!this.model || !this.isReady) {
      return { text: '', words: [], error: 'Model not ready' };
    }
    try {
      const debug = debugEnabled();
      const result = await this.model.transcribe(audio, SAMPLE_RATE, {
        returnTimestamps: true,

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

  async stop(): Promise<void> {
    this.decoderState = undefined;
    this.segmentBuffer = '';
    this.currentSegmentId = '';
    this.status = this.model ? 'ready' : 'idle';
    this.events.onStatusChange(this.status);
    segmentCounter = 0;
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary.setWords(config.words, config.strength);
  }

  disable(): void {
    this.model = null;
    this.vocabulary.setVocab(null);
    this.decoderState = undefined;
    this.status = 'disabled';
    this.loadingPromise = null;
    this.events.onStatusChange('disabled');
  }

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
      seg.words = result.words.map((w) => ({
        text: w.text,
        start: w.start_time,
        end: w.end_time,
        ...(typeof w.confidence === 'number' ? { confidence: w.confidence } : {}),
      }));
    }

    if (isFinal) {
      this.segmentBuffer = '';
      this.currentSegmentId = '';
    }

    return [seg];
  }

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

  setLanguageHint(_code: string | null): void {}

  lockLanguage(): void {
    this.languageLocked = true;
  }

  unlockLanguage(): void {
    this.languageLocked = false;
  }
}
