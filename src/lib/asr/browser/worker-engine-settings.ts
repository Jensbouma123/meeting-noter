import { getAsrLanguageHint, subscribeAsrLanguageHint } from './language-hint';
import { getVocabularyBiasConfig, subscribeVocabulary } from '@/lib/vocabulary/store';
import type { VocabularyBiasConfig } from '@/lib/vocabulary/types';
import type { LocalAsrEngine } from './engine-factory';
import type { EngineCall } from './types';
import type { WorkerCallChannel } from './worker-call-channel';

export class WorkerEngineSettings {
  languageLocked = false;
  languageHint: string | null = getAsrLanguageHint();
  vocabulary: VocabularyBiasConfig = getVocabularyBiasConfig();

  applyToLocal(engine: LocalAsrEngine): void {
    if (this.languageLocked) engine.lockLanguage();
    if (this.languageHint) engine.setLanguageHint(this.languageHint);
    if (this.vocabulary.words.length > 0) engine.setVocabulary(this.vocabulary);
  }

  replayToWorker(channel: WorkerCallChannel): void {
    if (this.languageLocked) channel.notify({ method: 'lockLanguage' });
    if (this.languageHint) channel.notify({ method: 'setLanguageHint', args: { code: this.languageHint } });
    if (this.vocabulary.words.length > 0) channel.notify({ method: 'setVocabulary', args: this.vocabulary });
  }
}

export function dispatchSetting(
  local: LocalAsrEngine | null,
  channel: WorkerCallChannel,
  applyLocal: (engine: LocalAsrEngine) => void,
  call: EngineCall,
): void {
  if (local) applyLocal(local);
  else if (channel.isAttached) channel.notify(call);
}

export function followSettingChanges(onVocabulary: () => void, onLanguageHint: () => void): () => void {
  const unfollowVocabulary = subscribeVocabulary(onVocabulary);
  const unfollowLanguageHint = subscribeAsrLanguageHint(onLanguageHint);
  return () => {
    unfollowVocabulary();
    unfollowLanguageHint();
  };
}
