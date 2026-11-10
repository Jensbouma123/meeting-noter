/** The in-thread engine for a config: Parakeet unless the manifest says
 *  Nemotron. Used by the worker and by `engine-client.ts`'s on-page path. */
import { BrowserASREngine } from './parakeet';
import { NemotronASREngine } from './nemotron';
import type { BrowserASRConfig, BrowserASREvents } from './types';

export type LocalAsrEngine = BrowserASREngine | NemotronASREngine;

export function createLocalAsrEngine(config: BrowserASRConfig, events: BrowserASREvents): LocalAsrEngine {
  return config.engine === 'nemotron' ? new NemotronASREngine(config, events) : new BrowserASREngine(config, events);
}
