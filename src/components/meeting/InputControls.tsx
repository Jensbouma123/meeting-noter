'use client';

import { VolumeX } from 'lucide-react';
import { Tooltip } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { MicPicker } from './MicPicker';
import { CaptureModePicker } from './CaptureModePicker';
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
      <CaptureModePicker mode={mode} locked={inputsLocked} onChange={onModeChange} />

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
