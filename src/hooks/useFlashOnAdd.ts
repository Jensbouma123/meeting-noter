'use client';

import { useRef, useState } from 'react';
import type { RefCallback } from 'react';
import type { FlashRowProps } from './types';

const FLASH_MS = 1000;
const BASE = 'rounded-md transition-colors duration-500 motion-reduce:transition-none';
const ON = 'bg-primary-500/15';

export function useFlashOnAdd(block: ScrollLogicalPosition = 'nearest'): {
  flash: (id: string) => void;
  rowProps: (id: string) => FlashRowProps;
} {
  const [flashId, setFlashId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = useRef(false);

  const flash = (id: string) => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    clearTimeout(timer.current);
    setFlashId(id);
    timer.current = setTimeout(() => setFlashId(null), FLASH_MS);
  };

  const scrollTo: RefCallback<HTMLElement> = (node) => {
    node?.scrollIntoView?.({ behavior: reduced.current ? 'auto' : 'smooth', block });
  };

  const rowProps = (id: string): FlashRowProps =>
    id === flashId ? { ref: scrollTo, className: `${BASE} ${ON}` } : { className: BASE };

  return { flash, rowProps };
}
