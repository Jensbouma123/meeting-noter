import type { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { NemotronRecognizer } from './nemotron-recognizer';
import type { SerialQueue } from './serial-queue';
import type { BrowserASRConfig, BrowserASREvents, BrowserASRStatus } from './types';

export interface NemotronLoadDeps {
  config: BrowserASRConfig;
  vocabulary: BiaserSlot;
  queue: SerialQueue;
  events: BrowserASREvents;
  setStatus: (status: BrowserASRStatus) => void;
  setRecognizer: (recognizer: NemotronRecognizer) => void;
}
