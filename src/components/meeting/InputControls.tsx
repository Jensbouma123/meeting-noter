'use client';

import { Mic, PhoneCall, VolumeX } from 'lucide-react';
import { Tab, TabList, Tabs, Tooltip } from '@jensbouma123/acciva-ui';
import type { CaptureMode } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import { MicPicker } from './MicPicker';
import { ROUND } from './bottomDockStyles';
import type { InputControlsProps } from './InputControls.types';

export function InputControls({
  mode,
  inputsLocked,
  isLive,
  micDeviceId,
  showCallAudioMissing,
  callAudioMissingReason,
  onModeChange,
  onMicDeviceChange,
  onOpenAdvanced,
}: InputControlsProps) {
  const t = useT('dock');

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Tabs value={mode === 'system' ? 'both' : mode} onValueChange={(value) => onModeChange(value as CaptureMode)} size="md" variant="pill">
        <TabList aria-label={t('audioSource')} className={`${ROUND} [&>[data-indicator]]:!rounded-full`}>
          <Tooltip content={inputsLocked ? t('micTipLocked') : t('micTip')}>
            <span className="inline-flex">
              <Tab value="mic" disabled={inputsLocked} className={`gap-1.5 ${ROUND}`}>
                <Mic aria-hidden="true" />
                <span className="sr-only md:not-sr-only">{t('mic')}</span>
              </Tab>
            </span>
          </Tooltip>
          <Tooltip content={inputsLocked ? t('micCallTipLocked') : t('micCallTip')}>
            <span className="inline-flex">
              <Tab value="both" disabled={inputsLocked} className={`gap-1.5 whitespace-nowrap ${ROUND}`}>
                <PhoneCall aria-hidden="true" />
                <span className="sr-only md:not-sr-only">{t('micCall')}</span>
              </Tab>
            </span>
          </Tooltip>
        </TabList>
      </Tabs>

      <MicPicker
        value={micDeviceId}
        onChange={onMicDeviceChange}
        locked={inputsLocked}
        mode={mode}
        active={isLive}
        callMissing={showCallAudioMissing}
      />

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
