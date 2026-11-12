'use client';

import { useEffect, useRef } from 'react';
import type { CaptureMode, Levels } from '@/lib/meeting';
import { meeting } from './store';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import { HStack, Tooltip } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

interface LevelMeterProps {
  mode: CaptureMode;
  active: boolean;
  /** No call source is attached (declined, unsupported, Safari): the call meter shows "none". */
  callMissing?: boolean;
  /**
   * Two slim vertical VU bars (mic, then call) side by side with the icon
   * under each, for use inside the dock's microphone button: no tooltips or
   * focus stops, since the surrounding button is the only interactive element.
   */
  stacked?: boolean;
}

export function LevelMeter({ mode, active, callMissing = false, stacked = false }: LevelMeterProps) {
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

    // Stacked bars fill upward (height); the inline layout fills rightward (width).
    const dim = stacked ? 'height' : 'width';
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
        micBarRef.current.style[dim] = `${(scaleMic * 100).toFixed(1)}%`;
        setNow(micBarRef.current, scaleMic);
        micBarRef.current.style.opacity = active ? `${0.45 + scaleMic * 0.55}` : '0.2';
      }

      if (sysBarRef.current) {
        const scaleSys = Math.max(0.08, Math.min(1, smoothed.system));
        sysBarRef.current.style[dim] = `${(scaleSys * 100).toFixed(1)}%`;
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
  }, [active, callMissing, stacked]);

  const showMic = mode === 'mic' || mode === 'both';
  const showSystem = mode === 'system' || mode === 'both';

  if (stacked) {
    const track = 'relative flex h-5 w-1.5 items-end overflow-hidden rounded-full bg-foreground/15';
    return (
      <div className="flex items-end gap-2" role="group" aria-label={t('audioLevels')}>
        {showMic && (
          <div className="flex flex-col items-center gap-0.5">
            <div
              role="meter"
              aria-label={t('micLevel')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              className={track}
            >
              <div ref={micBarRef} className="w-full rounded-full bg-primary-400" style={{ height: '8%', opacity: 0.2 }} />
            </div>
            <Mic className={`size-3 transition-colors ${active ? 'text-primary-400' : 'text-muted-foreground'}`} aria-hidden="true" />
          </div>
        )}
        {showSystem && callMissing && (
          <div className="flex flex-col items-center gap-0.5" aria-label={t('noCallLevel')}>
            <span className="flex h-5 items-center text-[10px] font-medium leading-none text-muted-foreground">{t('none')}</span>
            <VolumeX className="size-3 text-warning" aria-hidden="true" />
          </div>
        )}
        {showSystem && !callMissing && (
          <div className="flex flex-col items-center gap-0.5">
            <div
              role="meter"
              aria-label={t('callLevel')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              className={track}
            >
              <div ref={sysBarRef} className="w-full rounded-full bg-secondary-400" style={{ height: '8%', opacity: 0.2 }} />
            </div>
            <Volume2 className={`size-3 transition-colors ${active ? 'text-secondary-400' : 'text-muted-foreground'}`} aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  return (
    <HStack
      as="div"
      spacing="sm"
      align="center"
      role="group"
      aria-label={t('audioLevels')}
      className="rounded-full border border-border-subtle bg-surface px-2.5 py-1"
    >
      {showMic && (
        <Tooltip content={t('micLevel')} side="top">
          <div tabIndex={0} aria-label={t('micLevel')} className="flex items-center gap-1.5">
            <Mic className={`size-3.5 transition-colors ${active ? 'text-primary-400' : 'text-muted-foreground'}`} />
            <div className="relative h-1.5 w-10 overflow-hidden rounded-full bg-foreground/15">
              <div
                ref={micBarRef}
                className="h-full rounded-full bg-primary-400"
                style={{ width: '8%', opacity: 0.2 }}
              />
            </div>
          </div>
        </Tooltip>
      )}

      {showSystem && callMissing && (
        <Tooltip content={t('noCallAudioTip')} side="top">
          <div tabIndex={0} aria-label={t('noCallLevel')} className="flex items-center gap-1.5">
            <VolumeX className="size-3.5 text-warning" />
            <span className="text-[11px] font-medium leading-none text-muted-foreground">{t('none')}</span>
          </div>
        </Tooltip>
      )}

      {showSystem && !callMissing && (
        <Tooltip content={t('callLevel')} side="top">
          <div tabIndex={0} aria-label={t('callLevel')} className="flex items-center gap-1.5">
            <Volume2 className={`size-3.5 transition-colors ${active ? 'text-secondary-400' : 'text-muted-foreground'}`} />
            <div className="relative h-1.5 w-10 overflow-hidden rounded-full bg-foreground/15">
              <div
                ref={sysBarRef}
                className="h-full rounded-full bg-secondary-400"
                style={{ width: '8%', opacity: 0.2 }}
              />
            </div>
          </div>
        </Tooltip>
      )}
    </HStack>
  );
}
