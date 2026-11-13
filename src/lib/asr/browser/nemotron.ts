import { nemotronLangId, NemotronRecognizer } from './nemotron-core';
import { loadNemotronRecognizer } from './nemotron-loader';
import { buildNemotronLanguageInfo, resetNemotronSegmentIds } from './nemotron-segments';
import { NemotronSegmenter } from './nemotron-segmenter';
import { recognizeSafely } from './nemotron-recognize';
import { SerialQueue } from './serial-queue';
import type {
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRStatus,
  BrowserRecognizeResult,
  BrowserTranscribeResult,
} from './types';
import { SingleFlight } from './single-flight';
import { DEFAULT_BROWSER_ASR_CONFIG } from './constants';
import { installQuietAsrConsole } from './quiet-console';
import { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';

installQuietAsrConsole();
export class NemotronASREngine {
  private recognizer: NemotronRecognizer | null = null;
  private config: BrowserASRConfig;
  private status: BrowserASRStatus = 'idle';
  private readonly loading = new SingleFlight();
  private readonly segmenter = new NemotronSegmenter();
  private languageLocked = false;
  private languageHint: string | null = null;
  private readonly queue = new SerialQueue();
  private readonly vocabulary = new BiaserSlot();

  constructor(config: Partial<BrowserASRConfig> = {}, private readonly events: BrowserASREvents) {
    this.config = { ...DEFAULT_BROWSER_ASR_CONFIG, ...config };
  }

  getStatus(): BrowserASRStatus {
    return this.status;
  }

  get isReady(): boolean {
    return this.recognizer !== null && (this.status === 'ready' || this.status === 'transcribing');
  }

  async ensureLoaded(): Promise<void> {
    if (this.isReady) return;
    return this.loading.run(() => this._loadModel());
  }

  private async _loadModel(): Promise<void> {
    this.status = 'loading';
    this.events.onStatusChange('loading');
    try {
      await loadNemotronRecognizer(
        this.config,
        this.vocabulary,
        (fn) => this.queue.run(fn),
        (progress) => this.events.onLoadProgress?.(progress),
        (recognizer) => (this.recognizer = recognizer),
      );
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
      const result = await this._recognizeSerial(recognizer, audio);
      const segments = this.segmenter.build(result.text, result.words, audio.length, source, speakerLabel, isFinal);
      segments.forEach((seg) => this.events.onSegment(seg));
      const language = buildNemotronLanguageInfo(this.config.language, this.languageLocked);
      return { segments, language, error: null };
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
    return recognizeSafely(
      () => this._recognizeSerial(recognizer, audio),
      (message) => this.events.onError(message),
    );
  }

  async stop(): Promise<void> {
    this.segmenter.reset();
    resetNemotronSegmentIds();
    this.status = this.recognizer ? 'ready' : 'idle';
    this.events.onStatusChange(this.status);
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary.setWords(config.words, config.strength);
  }

  disable(): void {
    this.recognizer = null;
    this.vocabulary.setVocab(null);
    this.status = 'disabled';
    this.loading.clear();
    this.events.onStatusChange('disabled');
  }

  setLanguageHint(code: string | null): void {
    this.languageHint = code;
  }

  private _recognizeSerial(recognizer: NemotronRecognizer, audio: Float32Array) {
    return this.queue.run(() =>
      recognizer.recognize(audio, {
        langId: nemotronLangId(this.languageHint ?? 'auto'),
        biaser: this.vocabulary.get(),
      }),
    );
  }

  lockLanguage(): void {
    this.languageLocked = true;
  }

  unlockLanguage(): void {
    this.languageLocked = false;
  }
}
