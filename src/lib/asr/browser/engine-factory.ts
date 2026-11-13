import { BrowserASREngine } from './parakeet';
import { NemotronASREngine } from './nemotron';
import type { BrowserASRConfig, BrowserASREvents } from './types';

export type LocalAsrEngine = BrowserASREngine | NemotronASREngine;

export function createLocalAsrEngine(config: BrowserASRConfig, events: BrowserASREvents): LocalAsrEngine {
  return config.engine === 'nemotron' ? new NemotronASREngine(config, events) : new BrowserASREngine(config, events);
}
