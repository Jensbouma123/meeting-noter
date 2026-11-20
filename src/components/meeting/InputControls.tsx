'use client';

import { Settings, VolumeX } from 'lucide-react';
import { Tooltip } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MicLevelPip } from './MicLevelPip';
import type { InputControlsProps } from './InputControls.types';

export function InputControls({
  drawer,
  isLive,
  showCallAudioMissing,
  callAudioMissingReason,
  onOpenAdvanced,
}: InputControlsProps) {
  const t = useT('dock');
  const { triggerRef, open, id, toggle } = drawer;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Tooltip content={t('audioSettings')} side="top">
        <button
          ref={triggerRef}
          type="button"
          aria-label={t('audioSettings')}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={toggle}
          className="focus-ring touch-target-44 inline-flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-foreground transition-colors hover:bg-elevation-2 active:bg-elevation-3 aria-expanded:bg-elevation-2 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 dark:aria-expanded:bg-elevation-3"
        >
          <Settings className="size-4" aria-hidden="true" />
          <MicLevelPip active={isLive} />
        </button>
      </Tooltip>

      {showCallAudioMissing && (
        <Tooltip content={callAudioMissingReason} side="top">
          <button
            type="button"
            aria-label={`${t('noCallAudio')}. ${callAudioMissingReason}`}
            onClick={onOpenAdvanced}
            className="focus-ring touch-target-44 inline-flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-warning/10 px-3 text-sm font-medium text-warning transition-colors hover:bg-warning/20"
          >
            <VolumeX className="size-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">{t('noCallAudio')}</span>
          </button>
        </Tooltip>
      )}
    </div>
  );
}
