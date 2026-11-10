'use client';

import { useEffect, useRef } from 'react';
import { meeting } from './store';

/**
 * End the recording when the meeting view unmounts (navigating to another
 * session or page), so the microphone does not stay open behind a view that
 * no longer shows it.
 *
 * The release waits one microtask and checks that this same component did
 * not mount again: StrictMode's simulated unmount remounts it synchronously,
 * and that must not stop anything.
 */
export function useReleaseOnUnmount(): void {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) void meeting.release().catch(() => {});
      });
    };
  }, []);
}
