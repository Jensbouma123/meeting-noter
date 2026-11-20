'use client';

import { useT } from '@/lib/i18n/useT';
import { CaptureModePicker } from './CaptureModePicker';
import { MicPicker } from './MicPicker';
import type { AudioSettingsDrawerProps } from './AudioSettingsDrawer.types';

/** Audio settings panel that slides up above the dock; stays mounted while `closing` so the exit transition plays. */
export function AudioSettingsDrawer({
  drawer,
  mode,
  locked,
  isLive,
  micDeviceId,
  callMissing,
  onModeChange,
  onMicDeviceChange,
}: AudioSettingsDrawerProps) {
  const t = useT('dock');
  if (drawer.phase === 'closed') return null;
  const closing = drawer.phase === 'closing';

  return (
    <div
      id={drawer.id}
      role="dialog"
      aria-label={t('audioSettings')}
      aria-hidden={closing || undefined}
      inert={closing || undefined}
      onTransitionEnd={drawer.onTransitionEnd}
      className={`absolute bottom-full left-1/2 mb-2 flex w-[min(26rem,calc(100vw-32px))] min-w-full -translate-x-1/2 flex-col gap-4 rounded-[26px] border border-border-subtle bg-surface/95 p-4 shadow-elevation-3 backdrop-blur-md transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none ${
        closing ? 'translate-y-2 opacity-0' : ''
      }`}
    >
      <CaptureModePicker mode={mode} locked={locked} onChange={onModeChange} />
      <MicPicker
        value={micDeviceId}
        onChange={onMicDeviceChange}
        locked={locked}
        mode={mode}
        active={isLive}
        callMissing={callMissing}
      />
    </div>
  );
}
