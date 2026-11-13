import { getAsrLanguageHint, subscribeAsrLanguageHint } from './language-hint';
import { getVocabularyBiasConfig, subscribeVocabulary } from '@/lib/vocabulary/store';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import type { LocalAsrEngine } from './engine-factory';
import type { WorkerCallChannel } from './worker-call-channel';
import type { EngineCall } from './types';

export class WorkerEngineSettings {
  languageLocked = false;
  languageHint: string | null = getAsrLanguageHint();
  vocabulary: VocabularyBiasConfig = getVocabularyBiasConfig();

  constructor(
    private readonly getLocal: () => LocalAsrEngine | null,
    private readonly channel: WorkerCallChannel,
  ) {}

  lockLanguage(): void {
    this.languageLocked = true;
    this.dispatch((e) => e.lockLanguage(), { method: 'lockLanguage' });
  }

  unlockLanguage(): void {
    this.languageLocked = false;
    this.dispatch((e) => e.unlockLanguage(), { method: 'unlockLanguage' });
  }

  setLanguageHint(code: string | null): void {
    this.languageHint = code;
    this.dispatch((e) => e.setLanguageHint(code), { method: 'setLanguageHint', args: { code } });
  }

  setVocabulary(config: VocabularyBiasConfig): void {
    this.vocabulary = config;
    this.dispatch((e) => e.setVocabulary(config), { method: 'setVocabulary', args: config });
  }

  applyToLocal(engine: LocalAsrEngine): void {
    if (this.languageLocked) engine.lockLanguage();
    if (this.languageHint) engine.setLanguageHint(this.languageHint);
    if (this.vocabulary.words.length > 0) engine.setVocabulary(this.vocabulary);
  }

  replayToWorker(): void {
    if (this.languageLocked) this.channel.notify({ method: 'lockLanguage' });
    if (this.languageHint) this.channel.notify({ method: 'setLanguageHint', args: { code: this.languageHint } });
    if (this.vocabulary.words.length > 0) this.channel.notify({ method: 'setVocabulary', args: this.vocabulary });
  }

  followStoreChanges(): () => void {
    const unfollowVocabulary = subscribeVocabulary(() => this.setVocabulary(getVocabularyBiasConfig()));
    const unfollowLanguageHint = subscribeAsrLanguageHint(() => this.setLanguageHint(getAsrLanguageHint()));
    return () => {
      unfollowVocabulary();
      unfollowLanguageHint();
    };
  }

  private dispatch(applyLocal: (engine: LocalAsrEngine) => void, call: EngineCall): void {
    const local = this.getLocal();
    if (local) applyLocal(local);
    else if (this.channel.isAttached) this.channel.notify(call);
  }
}
