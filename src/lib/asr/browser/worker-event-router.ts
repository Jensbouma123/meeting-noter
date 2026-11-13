import type { BrowserASREvents, EngineWorkerOut } from './types';

export function forwardEngineEvent(msg: EngineWorkerOut, events: BrowserASREvents): void {
  switch (msg.type) {
    case 'segment':
      events.onSegment(msg.segment);
      return;
    case 'language':
      events.onLanguage(msg.language);
      return;
    case 'error':
      events.onError(msg.message);
      return;
    case 'loadProgress':
      events.onLoadProgress?.(msg.progress);
      return;
    default:
      return;
  }
}
