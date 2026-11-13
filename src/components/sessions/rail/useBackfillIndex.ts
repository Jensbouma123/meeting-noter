import { useCallback, useEffect, useRef, useState } from 'react';
import { backfillIndex } from '@/lib/semantic-search/backfill';
import type { BackfillProgress } from '@/lib/semantic-search/backfill.types';
import { onSearchModelReady } from '@/lib/semantic-search/model-gate';
import { getState, subscribe } from '@/lib/meeting/store-core';

export function useBackfillIndex(sessionCount: number): BackfillProgress | null {
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const running = useRef(false);
  const attempted = useRef(new Set<string>());
  const aborted = useRef({ aborted: false });

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const result = await backfillIndex({
        attempted: attempted.current,
        signal: aborted.current,
        onProgress: setProgress,
      });
      if (result.total === 0) setProgress(null);
    } catch {
      setProgress(null);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    aborted.current.aborted = false;
    const signal = aborted.current;
    const start = setTimeout(() => void run(), 0);
    const unsubscribe = subscribe(() => {
      if (getState().status === 'idle') void run();
    });
    const offReady = onSearchModelReady(() => void run());
    return () => {
      offReady();
      clearTimeout(start);
      signal.aborted = true;
      unsubscribe();
    };
  }, [run, sessionCount]);

  return progress;
}
