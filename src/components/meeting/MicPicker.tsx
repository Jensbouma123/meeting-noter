'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
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
import type { CaptureMode } from '@/lib/meeting';

interface MicPickerProps {
  /** `AppSettings.micDeviceId`; `'default'` means the system default. */
  value: string;
  onChange: (deviceId: string) => void;
  /** Recording is active: the pipeline reads the device once at start, so it cannot change live. */
  locked: boolean;
  /** Drives the level bars inside the button. */
  mode: CaptureMode;
  /** Audio is flowing (live), so the bars move. */
  active: boolean;
  callMissing?: boolean;
}

/** Gap between the button and the menu that opens above it. */
export const MENU_GAP_PX = 8;

/** Microphone menu for the dock; shares its setting with Settings › Microphone. */
export function MicPicker({ value, onChange, locked, mode, active, callMissing = false }: MicPickerProps) {
  const t = useT('dock');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refresh = useCallback(() => {
    meeting
      .listMicDevices()
      .then((devs) => setDevices(devs.filter((d) => d.deviceId && d.deviceId !== 'default')))
      .catch(() => {
        // Only "Default" is offered when enumeration fails.
      });
  }, []);

  useEffect(() => {
    refresh();
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    md?.addEventListener?.('devicechange', refresh);
    return () => md?.removeEventListener?.('devicechange', refresh);
  }, [refresh]);

  const label = t('chooseMic');
  // The level pill is the button: two vertical bars (mic, call) with their icons below.
  const trigger = (
    <button
      type="button"
      disabled={locked}
      aria-label={label}
      className="touch-target-44 inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-surface px-3.5 transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      <LevelMeter stacked mode={mode} active={active} callMissing={callMissing} />
    </button>
  );

  if (locked) {
    // A disabled button swallows pointer events, so the tooltip hangs on a wrapper.
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
