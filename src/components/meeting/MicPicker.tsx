'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { meeting } from './store';
import { LevelMeter } from './LevelMeter';
import type { MicPickerProps } from './MicPicker.types';

export function MicPicker({ value, onChange, locked, mode, active, callMissing = false }: MicPickerProps) {
  const t = useT('dock');
  const selectId = useId();
  const noteId = useId();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(() => {
    meeting
      .listMicDevices()
      .then((devs) => setDevices(devs.filter((d) => d.deviceId && d.deviceId !== 'default')))
      .catch(() => setDevices([]));
  }, []);

  useEffect(() => {
    refresh();
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    md?.addEventListener?.('devicechange', refresh);
    return () => md?.removeEventListener?.('devicechange', refresh);
  }, [refresh]);

  return (
    <section className="flex flex-col gap-2">
      <label
        htmlFor={selectId}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('microphone')}
      </label>
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <select
            id={selectId}
            value={value}
            disabled={locked}
            aria-describedby={locked ? noteId : undefined}
            onChange={(e) => onChange(e.target.value)}
            className="focus-ring h-10 w-full appearance-none truncate rounded-xl border border-border-subtle bg-surface pl-3 pr-9 text-sm text-foreground enabled:cursor-pointer disabled:cursor-default disabled:opacity-60"
          >
            <option value="default">{t('defaultMic')}</option>
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || t('micN').replace('{n}', String(i + 1))}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <LevelMeter mode={mode} active={active} callMissing={callMissing} />
      </div>
      {locked && (
        <p id={noteId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {t('micLockedTip')}
        </p>
      )}
    </section>
  );
}
