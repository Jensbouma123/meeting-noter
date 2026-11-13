'use client';

import { useSyncExternalStore } from 'react';
import {
  getPostStopProgress,
  getServerPostStopProgress,
  subscribePostStopTranscription,
} from '@/lib/meeting/post-stop-transcription';
import {
  getLiveFlushProgress,
  getServerLiveFlushProgress,
  subscribeLiveFlush,
} from '@/lib/meeting/live-flush-progress';

/**
 * How far Stop has got transcribing what was still buffered (0-100), or
 * `null` while that is not measured: the live flush's progress, else the
 * post-stop pass's on a device that transcribes after Stop.
 */
export function useFinishingPercent(): number | null {
  const live = useSyncExternalStore(subscribeLiveFlush, getLiveFlushProgress, getServerLiveFlushProgress);
  const postStop = useSyncExternalStore(
    subscribePostStopTranscription,
    getPostStopProgress,
    getServerPostStopProgress,
  );
  if (live && live.total > 0) return Math.round((live.done / live.total) * 100);
  if (postStop?.phase === 'transcribing') return postStop.percent;
  return null;
}
