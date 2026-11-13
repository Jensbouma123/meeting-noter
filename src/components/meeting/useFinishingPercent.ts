'use client';

import { useSyncExternalStore } from 'react';
import {
  getPostStopProgress,
  getServerPostStopProgress,
  subscribePostStopTranscription,
} from '@/lib/meeting/post-stop-progress';
import {
  getLiveFlushProgress,
  getServerLiveFlushProgress,
  subscribeLiveFlush,
} from '@/lib/meeting/live-flush-progress';

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
