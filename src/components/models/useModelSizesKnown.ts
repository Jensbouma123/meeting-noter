'use client';

import { useEffect, useState } from 'react';
import { probeRegisteredModelSizes, type ModelEntry } from '@/lib/asr/browser';

export function useModelSizesKnown(entries: Record<string, ModelEntry>): boolean {
  const [sizeKnown, setSizeKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (Object.keys(entries).length === 0) return;
    void probeRegisteredModelSizes().then(() => {
      if (!cancelled) setSizeKnown(true);
    });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  return sizeKnown;
}
