import { useEffect, useRef, useState } from 'react';

const TICK_INTERVAL_MS = 250;

export function useElapsedSeconds(isLive: boolean, isRecordingActive: boolean): number {
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [wasActive, setWasActive] = useState(isRecordingActive);
  const lastTickRef = useRef<number | null>(null);

  if (wasActive !== isRecordingActive) {
    setWasActive(isRecordingActive);
    if (isRecordingActive) setAccumulatedMs(0);
  }

  useEffect(() => {
    if (!isLive) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current ?? now);
      lastTickRef.current = now;
      setAccumulatedMs((ms) => ms + delta);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLive]);

  return Math.floor(accumulatedMs / 1000);
}
