'use client';

import { Check, ChevronUp, Mic, PhoneCall } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { CaptureModePickerProps } from './CaptureModePicker.types';

const MENU_GAP_PX = 8;

const OPTIONS = [
  { value: 'mic', Icon: Mic, label: 'mic', tip: 'micTip', lockedTip: 'micTipLocked' },
  { value: 'both', Icon: PhoneCall, label: 'micCall', tip: 'micCallTip', lockedTip: 'micCallTipLocked' },
] as const;

export function CaptureModePicker({ mode, locked, onChange }: CaptureModePickerProps) {
  const t = useT('dock');
  const current = OPTIONS.find((o) => o.value === (mode === 'system' ? 'both' : mode)) ?? OPTIONS[1];
  const trigger = (
    <button
      type="button"
      disabled={locked}
      aria-label={`${t('audioSource')}: ${t(current.label)}`}
      className="focus-ring touch-target-44 inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium text-foreground transition-colors enabled:cursor-pointer enabled:hover:bg-elevation-2 enabled:active:bg-elevation-3 aria-expanded:bg-elevation-2 disabled:cursor-default disabled:text-muted-foreground dark:enabled:hover:bg-elevation-3 dark:enabled:active:bg-elevation-4 dark:aria-expanded:bg-elevation-3"
    >
      <current.Icon className="size-4" aria-hidden="true" />
      <span className="sr-only md:not-sr-only">{t(current.label)}</span>
      {!locked && <ChevronUp className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />}
    </button>
  );

  if (locked) {
    return (
      <Tooltip content={t(current.lockedTip)}>
        <span className="inline-flex">{trigger}</span>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip content={t(current.tip)}>
        <span className="inline-flex">
          <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
        </span>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={MENU_GAP_PX} className="mic-menu max-w-72">
        {OPTIONS.map(({ value, Icon, label }) => {
          const selected = value === current.value;
          return (
            <DropdownMenuItem
              key={value}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onChange(value)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {t(label)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
