'use client';

import { useCallback, useEffect, useId, useRef, useState, type RefObject, type TransitionEvent } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { AudioDrawerPhase, AudioDrawerState } from './useAudioDrawer.types';

/** Open/close state of the dock's audio drawer; `closing` keeps it mounted until its exit transition ends. */
export function useAudioDrawer(rootRef: RefObject<HTMLElement | null>): AudioDrawerState {
  const [phase, setPhase] = useState<AudioDrawerPhase>('closed');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const open = phase === 'open';

  const close = useCallback(() => {
    setPhase((p) => (p === 'open' ? (reduceMotion ? 'closed' : 'closing') : p));
  }, [reduceMotion]);

  const toggle = useCallback(() => {
    if (open) close();
    else setPhase('open');
  }, [open, close]);

  const onTransitionEnd = useCallback((e: TransitionEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    setPhase((p) => (p === 'closing' ? 'closed' : p));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close, rootRef]);

  return { id, phase, open, toggle, close, triggerRef, onTransitionEnd };
}
