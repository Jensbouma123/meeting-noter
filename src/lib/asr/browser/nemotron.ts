import type { NemotronRecognizer } from './nemotron-recognizer';
import { loadNemotronEngineModel } from './nemotron-engine-load';
import { buildNemotronLanguageInfo, resetNemotronSegmentIds } from './nemotron-segments';
import { NemotronSegmenter } from './nemotron-segmenter';
import { recognizeSafely } from './nemotron-recognize';
import { SerialQueue } from './serial-queue';
import { NemotronSerialRecognizer } from './nemotron-serial-recognizer';
import { transcribeNemotronChunk } from './nemotron-chunk-transcribe';
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
  private readonly queue = new SerialQueue();
  private readonly vocabulary = new BiaserSlot();
  private readonly serial = new NemotronSerialRecognizer(this.queue, this.vocabulary);

  constructor(
    config: Partial<BrowserASRConfig> = {},
    private readonly events: BrowserASREvents,
  ) {
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
    await loadNemotronEngineModel({
      config: this.config,
      vocabulary: this.vocabulary,
      queue: this.queue,
      events: this.events,
      setStatus: (status) => this._setStatus(status),
      setRecognizer: (recognizer) => (this.recognizer = recognizer),
    });
  }

  private _setStatus(status: BrowserASRStatus): void {
    this.status = status;
    this.events.onStatusChange(status);
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
    this._setStatus('transcribing');
    try {
      const result = await transcribeNemotronChunk(
        { audio, source, speakerLabel, isFinal },
        {
          segmenter: this.segmenter,
          recognize: () => this.serial.run(recognizer, audio),
          language: () => buildNemotronLanguageInfo(this.config.language, this.languageLocked),
          onError: (message) => this.events.onError(message),
        },
      );
      result.segments.forEach((seg) => this.events.onSegment(seg));
      return result;
    } finally {
      this._setStatus('ready');
    }
  }

  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    await this.ensureLoaded();
    const recognizer = this.recognizer;
    if (!recognizer || !this.isReady) return { text: '', words: [], error: 'Model not ready' };
    return recognizeSafely(
      () => this.serial.run(recognizer, audio),
      (message) => this.events.onError(message),
    );
  }

  async stop(): Promise<void> {
    this.segmenter.reset();
    resetNemotronSegmentIds();
    this._setStatus(this.recognizer ? 'ready' : 'idle');
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary.setWords(config.words, config.strength);
  }

  disable(): void {
    this.recognizer = null;
    this.vocabulary.setVocab(null);
    this.loading.clear();
    this._setStatus('disabled');
  }

  setLanguageHint(code: string | null): void {
    this.serial.setLanguageHint(code);
  }

  lockLanguage(): void {
    this.languageLocked = true;
  }

  unlockLanguage(): void {
    this.languageLocked = false;
  }
}
