'use client';

import { useEffect, useRef } from 'react';
import type { CaptureMode, Levels } from '@/lib/meeting';
import { meeting } from './store';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

interface LevelMeterProps {
  mode: CaptureMode;
  active: boolean;
  /** No call source is attached (declined, unsupported, Safari): the call slot shows a muted speaker. */
  callMissing?: boolean;
}

/**
 * Icon + slim vertical VU bar per source (mic, then call), drawn inside the
 * dock's microphone button: no tooltips or focus stops of its own, since the
 * surrounding button is the only interactive element.
 */
export function LevelMeter({ mode, active, callMissing = false }: LevelMeterProps) {
  const t = useT('dock');
  const micBarRef = useRef<HTMLDivElement>(null);
  const sysBarRef = useRef<HTMLDivElement>(null);

  const targetsRef = useRef<Levels>({ mic: 0, system: 0 });
  const smoothedRef = useRef<Levels>({ mic: 0, system: 0 });
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = meeting.subscribeLevels((l) => {
      targetsRef.current.mic = active ? l.mic : 0;
      targetsRef.current.system = active ? l.system : 0;
    });

    // The fill sits inside the role=meter track; mirror the level onto it for assistive tech.
    const setNow = (fill: HTMLElement, v: number) => {
      const track = fill.parentElement;
      const pct = String(Math.round(v * 100));
      if (track && track.getAttribute('aria-valuenow') !== pct) track.setAttribute('aria-valuenow', pct);
    };

    const attack = 0.5;
    const release = 0.08;

    function renderLoop() {
      const targets = targetsRef.current;
      const smoothed = smoothedRef.current;

      const kMic = targets.mic > smoothed.mic ? attack : release;
      smoothed.mic += (targets.mic - smoothed.mic) * kMic;

      const kSys = targets.system > smoothed.system ? attack : release;
      smoothed.system += (targets.system - smoothed.system) * kSys;

      if (micBarRef.current) {
        const scaleMic = Math.max(0.08, Math.min(1, smoothed.mic));
        micBarRef.current.style.height = `${(scaleMic * 100).toFixed(1)}%`;
        setNow(micBarRef.current, scaleMic);
        micBarRef.current.style.opacity = active ? `${0.45 + scaleMic * 0.55}` : '0.2';
      }

      if (sysBarRef.current) {
        const scaleSys = Math.max(0.08, Math.min(1, smoothed.system));
        sysBarRef.current.style.height = `${(scaleSys * 100).toFixed(1)}%`;
        setNow(sysBarRef.current, scaleSys);
        sysBarRef.current.style.opacity = active ? `${0.45 + scaleSys * 0.55}` : '0.2';
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    }

    rafIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      unsubscribe();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [active, callMissing]);

  const showMic = mode === 'mic' || mode === 'both';
  const showSystem = mode === 'system' || mode === 'both';
  const track = 'relative flex h-5 w-1.5 items-end overflow-hidden rounded-full bg-foreground/15';
  const iconTone = (tone: string) => `size-4 shrink-0 transition-colors ${active ? tone : 'text-muted-foreground'}`;

  return (
    <span className="flex items-center gap-3" role="group" aria-label={t('audioLevels')}>
      {showMic && (
        <span className="flex items-center gap-1.5">
          <Mic className={iconTone('text-primary-600 dark:text-primary-400')} aria-hidden="true" />
          <span role="meter" aria-label={t('micLevel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className={track}>
            <span ref={micBarRef} className="block w-full rounded-full bg-primary-500 dark:bg-primary-400" style={{ height: '8%', opacity: 0.2 }} />
          </span>
        </span>
      )}
      {showSystem && callMissing && (
        <VolumeX role="img" aria-label={t('noCallLevel')} className="size-4 shrink-0 text-warning" />
      )}
      {showSystem && !callMissing && (
        <span className="flex items-center gap-1.5">
          <Volume2 className={iconTone('text-secondary-600 dark:text-secondary-400')} aria-hidden="true" />
          <span role="meter" aria-label={t('callLevel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} className={track}>
            <span ref={sysBarRef} className="block w-full rounded-full bg-secondary-500 dark:bg-secondary-400" style={{ height: '8%', opacity: 0.2 }} />
          </span>
        </span>
      )}
    </span>
  );
}
