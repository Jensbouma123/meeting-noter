import { int16ToFloat32 } from '../pcm';
import type { Source } from '../types/basics';
import { asrState } from './state';
import { acquireEngine } from './engine-acquire';
import { liveFeedOf } from './live-feed';
import { liveChunker } from './live-state';
import { pumpLiveAudio } from './live-pump';

export function pushLiveAudio(source: Source, pcm: ArrayBuffer, startSample?: number): void {
  if (!asrState.enabled || pcm.byteLength === 0 || pcm.byteLength % 2 !== 0) return;
  const feed = liveFeedOf(source);
  if (!asrState.engine?.isReady) {
    feed.droppedNotReady += 1;
    void acquireEngine();
    return;
  }
  feed.frames += 1;
  liveChunker(source).push(int16ToFloat32(pcm), startSample);
  pumpLiveAudio();
}
