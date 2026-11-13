import { createLocalAsrEngine, type LocalAsrEngine } from './engine-factory';
import { getAsrLanguageHint } from './language-hint';
import { connectWorker } from './worker-connect';
import { recognizeRemotely, transcribeRemotely } from './worker-remote-calls';
import { WorkerCallChannel } from './worker-call-channel';
import { WorkerEngineSettings, dispatchSetting, followSettingChanges } from './worker-engine-settings';
import { forwardEngineEvent } from './worker-event-router';
import { getVocabularyBiasConfig } from '@/lib/vocabulary/store';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import type {
  AsrEngine,
  BrowserASRConfig,
  BrowserASREvents,
  BrowserASRStatus,
  BrowserRecognizeResult,
  BrowserTranscribeResult,
  EngineWorkerOut,
} from './types';

export class WorkerBrowserASREngine implements AsrEngine {
  private local: LocalAsrEngine | null = null;
  private connecting: Promise<LocalAsrEngine | null> | null = null;
  private readonly channel = new WorkerCallChannel();
  private status: BrowserASRStatus = 'idle';
  private ready = false;
  private readonly settings = new WorkerEngineSettings();
  private readonly unfollowSettings = followSettingChanges(
    () => this.setVocabulary(getVocabularyBiasConfig()),
    () => this.setLanguageHint(getAsrLanguageHint()),
  );

  constructor(
    private readonly config: BrowserASRConfig,
    private readonly events: BrowserASREvents,
  ) {}

  get isReady(): boolean {
    return this.local ? this.local.isReady : this.ready;
  }

  getStatus(): BrowserASRStatus {
    return this.local ? this.local.getStatus() : this.status;
  }

  async ensureLoaded(): Promise<void> {
    const local = await this.connect();
    if (local) return local.ensureLoaded();
    await this.channel.call({ method: 'ensureLoaded' });
  }

  async transcribe(
    audio: Float32Array,
    source: 'mic' | 'system',
    speakerLabel: string,
    isFinal: boolean,
  ): Promise<BrowserTranscribeResult> {
    const local = await this.connect();
    if (local) return local.transcribe(audio, source, speakerLabel, isFinal);

    return transcribeRemotely(this.channel, this.events, audio, source, speakerLabel, isFinal);
  }

  async recognize(audio: Float32Array): Promise<BrowserRecognizeResult> {
    const local = await this.connect();
    if (local) return local.recognize(audio);
    return recognizeRemotely(this.channel, this.events, audio);
  }

  async stop(): Promise<void> {
    if (this.local) return this.local.stop();
    if (!this.channel.isAttached) {
      this.status = this.channel.disabled ? this.status : 'idle';
      this.events.onStatusChange(this.status);
      return;
    }
    await this.channel.call({ method: 'stop' }).catch(() => undefined);
  }

  disable(): void {
    this.channel.disabled = true;
    this.unfollowSettings();
    if (this.local) {
      this.local.disable();
      return;
    }
    this.channel.shutdown();
    this.ready = false;
    this.status = 'disabled';
    this.events.onStatusChange('disabled');
  }

  lockLanguage(): void {
    this.settings.languageLocked = true;
    dispatchSetting(this.local, this.channel, (e) => e.lockLanguage(), { method: 'lockLanguage' });
  }

  unlockLanguage(): void {
    this.settings.languageLocked = false;
    dispatchSetting(this.local, this.channel, (e) => e.unlockLanguage(), { method: 'unlockLanguage' });
  }

  setLanguageHint(code: string | null): void {
    this.settings.languageHint = code;
    dispatchSetting(this.local, this.channel, (e) => e.setLanguageHint(code), { method: 'setLanguageHint', args: { code } });
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.settings.vocabulary = config;
    dispatchSetting(this.local, this.channel, (e) => e.setVocabulary(config), { method: 'setVocabulary', args: config });
  }

  private connect(): Promise<LocalAsrEngine | null> {
    this.connecting ??= this.start();
    return this.connecting;
  }

  private async start(): Promise<LocalAsrEngine | null> {
    const outcome = await connectWorker(this.config, this.channel, {
      onMessage: (msg) => this.onMessage(msg),
      onCrash: (message) => this.onCrash(message),
    });
    if (outcome === 'run-on-page') return this.runOnPage();
    if (outcome === 'attached') this.settings.replayToWorker(this.channel);
    return null;
  }

  private runOnPage(): LocalAsrEngine {
    const engine = createLocalAsrEngine(this.config, this.events);
    this.settings.applyToLocal(engine);
    this.local = engine;
    return engine;
  }

  private onMessage(msg: EngineWorkerOut): void {
    if (this.channel.disabled || !msg) return;
    forwardEngineEvent(msg, this.events);
    if (msg.type === 'status') {
      this.status = msg.status;
      this.ready = msg.ready;
      this.events.onStatusChange(msg.status);
    } else if (msg.type === 'reply') {
      this.ready = msg.ready;
      this.channel.settle(msg);
    }
  }

  private onCrash(message: string): void {
    if (this.channel.disabled) return;
    this.channel.crash(message);
    this.ready = false;
    this.status = 'error';
    this.events.onStatusChange('error');
  }
}
