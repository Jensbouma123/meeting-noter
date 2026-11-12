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
  // The level bars are the button. Same height, radius and quiet ghost fill as the
  // dock's other secondary controls; the chevron only shows while the menu can open.
  // Locked is not dimmed: the bars are live audio feedback during a recording.
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
