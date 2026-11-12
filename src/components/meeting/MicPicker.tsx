'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Mic } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { meeting } from './store';

interface MicPickerProps {
  /** `AppSettings.micDeviceId`; `'default'` means the system default. */
  value: string;
  onChange: (deviceId: string) => void;
  /** Recording is active: the pipeline reads the device once at start, so it cannot change live. */
  locked: boolean;
}

/** Gap between the button and the menu that opens above it. */
export const MENU_GAP_PX = 8;

/** Microphone menu for the dock; shares its setting with Settings › Microphone. */
export function MicPicker({ value, onChange, locked }: MicPickerProps) {
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
  const trigger = (
    <Button
      variant="secondary"
      size={{ base: 'md', md: 'sm' }}
      disabled={locked}
      aria-label={label}
      leadingIcon={<Mic className="size-3.5" />}
      trailingIcon={<ChevronDown className="size-3" />}
      className="touch-target-44 shrink-0 !rounded-full"
    />
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
