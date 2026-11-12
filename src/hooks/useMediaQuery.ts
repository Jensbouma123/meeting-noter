'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches. Subscribes to the query's
 * `change` events via `useSyncExternalStore`, so no effect is needed to sync
 * state. The server snapshot is `false`, matching the first client render.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
