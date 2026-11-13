import type { LiveAsrFeed, LiveFeedCounts } from '../types/asr-live';
import type { Source } from '../types/basics';
import { liveChunkers } from './live-state';

const liveFeed = new Map<Source, LiveFeedCounts>();

export function clearLiveFeed(): void {
  liveFeed.clear();
}

export function liveFeedOf(source: Source): LiveFeedCounts {
  let feed = liveFeed.get(source);
  if (!feed) {
    feed = { frames: 0, droppedNotReady: 0, windows: 0, words: 0, segments: 0 };
    liveFeed.set(source, feed);
  }
  return feed;
}

export function getLiveAsrFeed(): Partial<Record<Source, LiveAsrFeed>> {
  const out: Partial<Record<Source, LiveAsrFeed>> = {};
  for (const [source, feed] of liveFeed) {
    const chunker = liveChunkers.get(source);
    out[source] = { ...feed, speechFrames: chunker?.speechFrames ?? 0, noiseFloor: chunker?.noiseFloor ?? 0 };
  }
  return out;
}
