'use client';

import { useEffect, useRef } from 'react';
import { meeting } from './store';

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
