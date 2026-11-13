import { LiveChunker } from '@/lib/asr/live-chunker';
import type { Source } from '../types/basics';
import { asrState } from './state';
import { clearSegmentTracking } from './place-segment';

export const liveChunkers = new Map<Source, LiveChunker>();
export const liveServedAt = new Map<Source, number>();
export const liveShowing = new Set<Source>();
export const liveGateOpenAt = new Map<Source, number>();
export const liveCounters = { segment: 0, served: 0, flushing: false, generation: 0 };

export function liveChunker(source: Source): LiveChunker {
  let chunker = liveChunkers.get(source);
  if (!chunker) {
    chunker = new LiveChunker(() => `live-${++liveCounters.segment}`);
    liveChunkers.set(source, chunker);
  }
  return chunker;
}

export function liveBufferedSamples(): number {
  let samples = 0;
  for (const chunker of liveChunkers.values()) samples += chunker.bufferedSamples;
  return samples;
}

export function liveBusy(): boolean {
  if (asrState.transcribeInFlight || liveCounters.flushing) return true;
  for (const chunker of liveChunkers.values()) if (chunker.due()) return true;
  return false;
}

export function clearLiveAudio(): void {
  liveCounters.generation += 1;
  liveChunkers.clear();
  liveServedAt.clear();
  liveShowing.clear();
  liveGateOpenAt.clear();
  clearSegmentTracking();
}
