import type { ParakeetModel } from 'parakeet.js';
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
import { silenceOrtSessionLogs } from './ort-logs';
import { loadParakeetModel } from './parakeet-loader';
import { buildLanguageInfo, resetSegmentIds } from './parakeet-segments';
import { recognizeWindow } from './parakeet-recognize';
import { ParakeetSegmenter } from './parakeet-segmenter';

installQuietAsrConsole();
silenceOrtSessionLogs();

export class BrowserASREngine {
  private model: ParakeetModel | null = null;
  private config: BrowserASRConfig;
  private events: BrowserASREvents;
  private status: BrowserASRStatus = 'idle';
  private readonly loading = new SingleFlight();
  private readonly segmenter = new ParakeetSegmenter();
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
    return this.loading.run(() => this._loadModel());
  }

  private async _loadModel(): Promise<void> {
    this.status = 'loading';
    this.events.onStatusChange('loading');
    try {
      await loadParakeetModel(
        this.config,
        this.vocabulary,
        (progress) => this.events.onLoadProgress?.(progress),
        (model) => (this.model = model),
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
    if (!this.model || this.status !== 'ready') {
      return { segments: [], language: null, error: 'Model not ready' };
    }
    this.status = 'transcribing';
    this.events.onStatusChange('transcribing');

    try {
      const segments = await this.segmenter.transcribeChunk(this.model, audio, source, speakerLabel, isFinal);
      const language = buildLanguageInfo(this.config.language, this.languageLocked);

      segments.forEach((seg) => this.events.onSegment(seg));

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
    if (!this.model || !this.isReady) {
      return { text: '', words: [], error: 'Model not ready' };
    }
    return recognizeWindow(this.model, audio, (message) => this.events.onError(message));
  }

  async stop(): Promise<void> {
    this.segmenter.resetDecoder();
    this.segmenter.resetText();
    this.status = this.model ? 'ready' : 'idle';
    this.events.onStatusChange(this.status);
    resetSegmentIds();
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary.setWords(config.words, config.strength);
  }

  disable(): void {
    this.model = null;
    this.vocabulary.setVocab(null);
    this.segmenter.resetDecoder();
    this.status = 'disabled';
    this.loading.clear();
    this.events.onStatusChange('disabled');
  }

  setLanguageHint(_code: string | null): void {}

  lockLanguage(): void {
    this.languageLocked = true;
  }

  unlockLanguage(): void {
    this.languageLocked = false;
  }
}
