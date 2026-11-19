import { pushEchoAudio } from '../echo/echo-store';
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
  const samples = int16ToFloat32(pcm);
  pushEchoAudio(source, samples, startSample);
  liveChunker(source).push(samples, startSample);
  pumpLiveAudio();
}
