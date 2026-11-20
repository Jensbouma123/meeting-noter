'use client';

import { useEffect, useRef } from 'react';
import { meeting } from './store';
import type { MicLevelPipProps } from './MicLevelPip.types';

const ATTACK = 0.5;
const RELEASE = 0.08;

/** Tiny decorative mic bar on the audio-settings cog, so incoming audio stays visible with the drawer closed. */
export function MicLevelPip({ active }: MicLevelPipProps) {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let target = 0;
    let smoothed = 0;
    let raf: number | null = null;
    const unsubscribe = meeting.subscribeLevels((l) => {
      target = active ? l.mic : 0;
    });
    const loop = () => {
      smoothed += (target - smoothed) * (target > smoothed ? ATTACK : RELEASE);
      const scale = Math.max(0.12, Math.min(1, smoothed));
      if (barRef.current) {
        barRef.current.style.height = `${(scale * 100).toFixed(1)}%`;
        barRef.current.style.opacity = active ? `${0.5 + scale * 0.5}` : '0.25';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      unsubscribe();
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [active]);

  return (
    <span aria-hidden="true" className="flex h-3.5 w-1 items-end overflow-hidden rounded-full bg-foreground/15">
      <span
        ref={barRef}
        data-testid="mic-level-pip"
        className="block w-full rounded-full bg-primary-500 dark:bg-primary-400"
        style={{ height: '12%', opacity: 0.25 }}
      />
    </span>
  );
}
