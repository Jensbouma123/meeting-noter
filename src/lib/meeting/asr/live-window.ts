import type { AsrEngine } from '@/lib/asr/browser';
import { debugEnabled } from '@/lib/asr/browser/quiet-console';
import type { LiveWindowRequest } from '@/lib/asr/types';
import { CAPTURE_SAMPLE_RATE } from '../pcm';
import { publishLiveUpdate } from '../speaker-attribution';
import type { Source } from '../types/basics';
import { asrState } from './state';
import { liveFeedOf } from './live-feed';
import { liveChunker, liveCounters, liveGateOpenAt, liveShowing } from './live-state';

export async function recognizeLiveWindow(
  engine: AsrEngine,
  source: Source,
  req: LiveWindowRequest,
): Promise<boolean> {
  const chunker = liveChunker(source);
  const generation = liveCounters.generation;
  asrState.transcribeInFlight = true;
  try {
    const startedAt = debugEnabled() ? performance.now() : 0;
    const result = await engine.recognize(req.audio);
    if (generation !== liveCounters.generation) return false;
    if (startedAt) {
      const replyAt = performance.now();
      console.debug(
        `[asr-latency] reply ${source} t=${replyAt.toFixed(0)}ms inference=${(replyAt - startedAt).toFixed(0)}ms`,
      );
    }
    if (result.error) {
      liveShowing.delete(source);
      chunker.abort();
      console.error('[asr] Transcription failed', result.error);
      return false;
    }
    const timeline = asrState.speakerTimeline;
    const openStart = chunker.openStartSample / CAPTURE_SAMPLE_RATE;
    const windowEnd = (req.startSample + req.audio.length) / CAPTURE_SAMPLE_RATE;
    const turnEnd = req.final ? undefined : timeline?.turnEnds(source, openStart, windowEnd)[0];
    const updates = chunker.apply(
      req,
      result.words,
      turnEnd === undefined ? undefined : Math.round(turnEnd * CAPTURE_SAMPLE_RATE),
    );
    const feed = liveFeedOf(source);
    feed.windows += 1;
    feed.words += result.words.length;
    feed.segments += updates.length;
    for (const update of updates) {
      publishLiveUpdate(source, update, timeline, () => asrState.speakerLabeler(source, req.audio));
      if (update.final) liveShowing.delete(source);
      else liveShowing.add(source);
    }
    if (debugEnabled() && updates.length > 0) {
      console.debug(`[asr-latency] apply ${source} t=${performance.now().toFixed(0)}ms segments=${updates.length}`);
      if (updates[updates.length - 1].final) liveGateOpenAt.delete(source);
    }
    return true;
  } catch (err) {
    if (generation !== liveCounters.generation) return false;
    liveShowing.delete(source);
    chunker.abort();
    console.error('[asr] Live transcription failed', err);
    return false;
  } finally {
    if (generation === liveCounters.generation) asrState.transcribeInFlight = false;
  }
}
