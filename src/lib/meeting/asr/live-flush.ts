import { beginLiveFlush, endLiveFlush, updateLiveFlush } from '../live-flush-progress';
import { publishLiveUpdate } from '../speaker-attribution';
import type { Source } from '../types/basics';
import { LIVE_FLUSH_MAX_WINDOWS, LIVE_FLUSH_POLL_MS, LIVE_FLUSH_WAIT_MS } from './constants';
import { asrState } from './state';
import { clearLiveAudio, liveBufferedSamples, liveChunkers, liveCounters } from './live-state';
import { recognizeLiveWindow } from './live-window';

const FLUSH_SOURCES: readonly Source[] = ['mic', 'system'];

async function flushSource(source: Source): Promise<void> {
  const chunker = liveChunkers.get(source);
  if (!chunker) return;
  for (let i = 0; i < LIVE_FLUSH_MAX_WINDOWS; i += 1) {
    const engine = asrState.engine?.isReady ? asrState.engine : null;
    const req = engine ? chunker.take(true) : null;
    if (!engine || !req) break;
    const ok = await recognizeLiveWindow(engine, source, req);
    updateLiveFlush(liveBufferedSamples());
    if (!ok || req.final) break;
  }
  for (const update of chunker.finish()) {
    publishLiveUpdate(source, update, asrState.speakerTimeline, () =>
      asrState.speakerLabeler(source, new Float32Array(0)),
    );
  }
}

export async function flushLiveAudio(): Promise<void> {
  liveCounters.flushing = true;
  beginLiveFlush(liveBufferedSamples());
  try {
    for (let waited = 0; asrState.transcribeInFlight && waited < LIVE_FLUSH_WAIT_MS; waited += LIVE_FLUSH_POLL_MS) {
      await new Promise((resolve) => setTimeout(resolve, LIVE_FLUSH_POLL_MS));
    }
    updateLiveFlush(liveBufferedSamples());
    for (const source of FLUSH_SOURCES) await flushSource(source);
  } finally {
    liveCounters.flushing = false;
    endLiveFlush();
    clearLiveAudio();
  }
}
