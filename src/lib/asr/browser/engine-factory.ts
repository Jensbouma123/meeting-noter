import { BrowserASREngine } from './parakeet';
import { NemotronASREngine } from './nemotron';
import type { BrowserASRConfig, BrowserASREvents, LocalAsrEngine } from './types';

export function createLocalAsrEngine(config: BrowserASRConfig, events: BrowserASREvents): LocalAsrEngine {
  return config.engine === 'nemotron' ? new NemotronASREngine(config, events) : new BrowserASREngine(config, events);
}
