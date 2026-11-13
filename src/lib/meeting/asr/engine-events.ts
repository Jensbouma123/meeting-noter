import type { BrowserASREvents, BrowserSegment } from '@/lib/asr/browser';
import { replaceSegmentFamily, upsertSegment } from '../segment-store';
import { attributeSpeakers } from '../speaker-attribution';
import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { recordFailure } from './state-updates';
import { onLoadProgress } from './progress-update';
import { placeSegment } from './place-segment';

function storeEngineSegment(seg: BrowserSegment): void {
  const placed = placeSegment(seg);
  const timeline = asrState.speakerTimeline;
  if (!timeline) {
    upsertSegment(placed);
    return;
  }
  replaceSegmentFamily(
    placed.id,
    attributeSpeakers(
      placed,
      (a, b) => timeline.speakerNear(placed.source, a, b),
      (a, b) => timeline.speakerFor(placed.source, a, b),
    ),
  );
}

export function buildEngineEvents(): BrowserASREvents {
  return {
    onSegment: storeEngineSegment,
    onLanguage() {},
    onStatusChange() {
      notifyBrowserListeners();
    },
    onLoadProgress(progress) {
      onLoadProgress(progress);
    },
    onError(message: string) {
      recordFailure('load', message);
      asrState.engine = null;
      notifyBrowserListeners();
    },
  };
}
