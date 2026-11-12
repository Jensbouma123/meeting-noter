'use client';

import { useEffect, useState } from 'react';
import { probeRegisteredModelSizes, type ModelEntry } from '@/lib/asr/browser';

/**
 * True once the registry's model sizes have been measured.
 *
 * The stated size is the single most important number in the download prompts
 * and cannot come from a constant (the encoder's weights live in a 2.4 GB
 * external `.data` blob), so both the consent dialog and onboarding measure it
 * before asking the user to commit to a download. This is the one place that
 * does the probe; re-probes whenever the registry entries change.
 */
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
