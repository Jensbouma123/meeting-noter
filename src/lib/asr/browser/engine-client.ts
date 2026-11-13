import { createLocalAsrEngine } from './engine-factory';
import { getVocabularyBiasConfig } from '@/lib/vocabulary/store';
import { WorkerBrowserASREngine } from './worker-browser-asr-engine';
import type { AsrEngine, BrowserASRConfig, BrowserASREvents } from './types';

export function createBrowserASREngine(config: BrowserASRConfig, events: BrowserASREvents): AsrEngine {
  if (typeof Worker === 'undefined') {
    const engine = createLocalAsrEngine(config, events);
    const vocabulary = getVocabularyBiasConfig();
    if (vocabulary.words.length > 0) engine.setVocabulary(vocabulary);
    return engine;
  }
  return new WorkerBrowserASREngine(config, events);
}
