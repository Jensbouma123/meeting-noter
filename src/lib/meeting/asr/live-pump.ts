import type { LiveWindowRequest } from '@/lib/asr/types';
import { debugEnabled } from '@/lib/asr/browser/quiet-console';
import { CAPTURE_SAMPLE_RATE } from '../pcm';
import type { Source } from '../types/basics';
import { asrState } from './state';
import {
  liveChunker,
  liveChunkers,
  liveCounters,
  liveGateOpenAt,
  liveServedAt,
  liveShowing,
} from './live-state';
import { recognizeLiveWindow } from './live-window';

function nextDueSource(): Source | null {
  let next: Source | null = null;
  for (const [source, chunker] of liveChunkers) {
    if (!chunker.due()) continue;
    if (next === null) {
      next = source;
      continue;
    }
    const firstNow = !liveShowing.has(source);
    const firstNext = !liveShowing.has(next);
    if (firstNow !== firstNext) {
      if (firstNow) next = source;
    } else if ((liveServedAt.get(source) ?? 0) < (liveServedAt.get(next) ?? 0)) {
      next = source;
    }
  }
  return next;
}

function traceTake(source: Source, req: LiveWindowRequest): void {
  if (!debugEnabled()) return;
  const now = performance.now();
  if (!liveShowing.has(source) && !liveGateOpenAt.has(source)) liveGateOpenAt.set(source, now);
  console.debug(
    `[asr-latency] take ${source} t=${now.toFixed(0)}ms window=${(req.audio.length / CAPTURE_SAMPLE_RATE).toFixed(2)}s` +
      ` firstPartial=${!liveShowing.has(source)} sinceFirstTake=${(now - (liveGateOpenAt.get(source) ?? now)).toFixed(0)}ms`,
  );
}

export function pumpLiveAudio(): void {
  if (asrState.transcribeInFlight || liveCounters.flushing) return;
  const engine = asrState.engine?.isReady ? asrState.engine : null;
  if (!engine) return;
  const next = nextDueSource();
  if (next === null) return;
  const req = liveChunker(next).take();
  if (!req) return;
  liveServedAt.set(next, ++liveCounters.served);
  traceTake(next, req);
  void recognizeLiveWindow(engine, next, req).then(() => pumpLiveAudio());
}
