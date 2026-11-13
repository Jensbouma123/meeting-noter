'use client';

import { useRef } from 'react';
import { getMeetingDiagnostics, type CaptureMode } from '@/lib/meeting';
import { callAudioHint } from '@/lib/meeting/call-audio-hint';
import { Divider } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { InputControls } from './InputControls';
import { RecordControls } from './RecordControls';
import { useCallAudioMissing } from './useCallAudioMissing';
import { useElapsedSeconds } from './useElapsedSeconds';
import { useReleaseOnUnmount } from './useReleaseOnUnmount';
import { useFinishingPercent } from './useFinishingPercent';
import type { BottomDockProps } from './BottomDock.types';

export function BottomDock({
  status,
  mode,
  modelReadiness,
  modelProgress,
  onModeChange,
  onStart,
  onStop,
  onPause,
  onResume,
  onOpenAdvanced,
  micDeviceId = 'default',
  onMicDeviceChange = () => {},
}: BottomDockProps) {
  const t = useT('dock');
  const dockRef = useRef<HTMLElement>(null);
  useReleaseOnUnmount();

  const isLive = status === 'live';
  const isPaused = status === 'paused';
  const isConnecting = status === 'connecting' || status === 'requesting';
  const isStopping = status === 'stopping';
  const isRecordingActive = isLive || isPaused || isConnecting;
  const inputsLocked = isRecordingActive || isStopping;
  const finishingPercent = useFinishingPercent();
  const finishingLabel =
    finishingPercent === null ? t('finishing') : t('finishingPercent').replace('{percent}', String(finishingPercent));

  const callAudioMissing = useCallAudioMissing();
  const showCallAudioMissing =
    isRecordingActive && callAudioMissing && (mode === 'system' || mode === 'both');
  const callAudioMissingReason = showCallAudioMissing ? callAudioHint(getMeetingDiagnostics()?.capture ?? null) : '';
  const modelReady = modelReadiness === 'ready';
  const modelPreparing = modelReadiness === 'downloading' || modelReadiness === 'loading';
  const needsModel = !isRecordingActive && !modelReady && !modelPreparing;
  const recordDisabled = !isRecordingActive && !modelReady && modelPreparing;
  const recordTooltip = !modelReady
    ? modelProgress.stage
      ? modelProgress.detail
        ? `${modelProgress.label} — ${modelProgress.detail}`
        : modelProgress.label
      : modelReadiness === 'failed'
        ? t('modelFailedTip')
        : t('modelMissingTip')
    : t('recordTip');

  const elapsedSeconds = useElapsedSeconds(isLive, isRecordingActive);

  return (
    <nav
      ref={dockRef}
      className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-max max-w-[calc(100%-32px)] -translate-x-1/2 select-none sm:bottom-6"
      aria-label={t('recordingControls')}
    >
      <span role="status" className="sr-only">
        {showCallAudioMissing ? `${t('noCallAudio')}. ${callAudioMissingReason}` : ''}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[26px] border border-border-subtle bg-surface/90 p-1.5 shadow-elevation-3 backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-1">
          <RecordControls
            isStopping={isStopping}
            isRecordingActive={isRecordingActive}
            isPaused={isPaused}
            needsModel={needsModel}
            recordDisabled={recordDisabled}
            recordTooltip={recordTooltip}
            finishingLabel={finishingLabel}
            elapsedSeconds={elapsedSeconds}
            onStart={onStart}
            onStop={onStop}
            onPause={onPause}
            onResume={onResume}
          />
        </div>

        <Divider orientation="vertical" className="mx-1 hidden h-6 w-px shrink-0 sm:block" />

        <InputControls
          mode={mode}
          inputsLocked={inputsLocked}
          isLive={isLive}
          micDeviceId={micDeviceId}
          showCallAudioMissing={showCallAudioMissing}
          callAudioMissingReason={callAudioMissingReason}
          onModeChange={onModeChange}
          onMicDeviceChange={onMicDeviceChange}
          onOpenAdvanced={onOpenAdvanced}
        />
      </div>
    </nav>
  );
}
