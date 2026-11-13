'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { meeting } from './store';
import { LevelMeter } from './LevelMeter';
import type { MicPickerProps } from './MicPicker.types';

const MENU_GAP_PX = 8;

export function MicPicker({ value, onChange, locked, mode, active, callMissing = false }: MicPickerProps) {
  const t = useT('dock');
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

  const label = t('chooseMic');
  const trigger = (
    <button
      type="button"
      disabled={locked}
      aria-label={label}
      className="focus-ring touch-target-44 inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-foreground transition-colors enabled:cursor-pointer enabled:hover:bg-elevation-2 enabled:active:bg-elevation-3 aria-expanded:bg-elevation-2 disabled:cursor-default dark:enabled:hover:bg-elevation-3 dark:enabled:active:bg-elevation-4 dark:aria-expanded:bg-elevation-3"
    >
      <LevelMeter mode={mode} active={active} callMissing={callMissing} />
      {!locked && <ChevronUp className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />}
    </button>
  );

  if (locked) {
    return (
      <Tooltip content={t('micLockedTip')}>
        <span className="inline-flex">{trigger}</span>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip content={label}>
        <span className="inline-flex">
          <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
        </span>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={MENU_GAP_PX} className="mic-menu max-w-72">
        <DropdownMenuItem
          icon={value === 'default' ? <Check className="size-4" /> : <span className="size-4" />}
          aria-current={value === 'default' ? 'true' : undefined}
          onClick={() => onChange('default')}
        >
          {t('defaultMic')}
        </DropdownMenuItem>
        {devices.map((d, i) => {
          const selected = d.deviceId === value;
          return (
            <DropdownMenuItem
              key={d.deviceId}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onChange(d.deviceId)}
            >
              {d.label || t('micN').replace('{n}', String(i + 1))}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
