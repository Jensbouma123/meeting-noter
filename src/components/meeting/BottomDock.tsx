'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCallAudioMissing, getMeetingDiagnostics, subscribeCallAudio, type CaptureMode, type Status } from '@/lib/meeting';
import { callAudioHint } from '@/lib/meeting/call-audio-hint';
import { MicPicker } from './MicPicker';
import { useReleaseOnUnmount } from './useReleaseOnUnmount';
import type { ModelProgressView, ModelReadiness } from './modelReadiness';
import { Circle, Download, Mic, Pause, Play, Square, VolumeX, PhoneCall } from 'lucide-react';
import { Button, Divider, Tab, TabList, Tabs, Tooltip } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

/*
 * One shape system for the whole bar: every control is 40px tall (`md`) and
 * fully round, inside a 6px-padded shell whose 26px radius is concentric with
 * them. Record is the only solid control; once recording, the same button
 * turns into Stop in a translucent red so it no longer shouts. Everything else
 * is a quiet ghost or the segmented track. `!` beats the variant's own fill,
 * since the library joins classes without merging them. Both reds hold AA:
 * `danger` with its own foreground, and `text-danger` on a 10% `danger` wash.
 */
const ROUND = '!rounded-full';
const STOP_TINT = '!bg-danger/10 !text-danger hover:!bg-danger/15 active:!bg-danger/20';
const MODEL_TINT =
  '!bg-primary-500/10 !text-primary-800 hover:!bg-primary-500/15 active:!bg-primary-500/20 dark:!bg-primary-400/15 dark:!text-primary-300';

/** Never `false` before the store hydrates client-side (no call to be missing yet). */
function getCallAudioMissingServerSnapshot(): boolean {
  return false;
}

interface BottomDockProps {
  status: Status;
  mode: CaptureMode;
  /** Speech model readiness — Record stays disabled until this is 'ready'. */
  modelReadiness: ModelReadiness;
  /**
   * Measured progress while the model is getting ready. Record is disabled
   * for exactly as long as this is non-null, so the percentage belongs right
   * next to the button that is waiting for it.
   */
  modelProgress: ModelProgressView;
  onModeChange: (newMode: CaptureMode) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenAdvanced: () => void;
  /** Saved microphone (`'default'` = system default); same value as Settings › Microphone. */
  micDeviceId?: string;
  onMicDeviceChange?: (deviceId: string) => void;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  // The dock owns the Record control, so it lives exactly as long as the
  // meeting view: leaving that view ends the recording.
  useReleaseOnUnmount();

  const isLive = status === 'live';
  const isPaused = status === 'paused';
  const isConnecting = status === 'connecting' || status === 'requesting';
  const isStopping = status === 'stopping';
  const isRecordingActive = isLive || isPaused || isConnecting;

  // "Call audio not included" — set by lib/meeting when Both/Call mode
  // couldn't attach a system-audio source (declined, unsupported, no audio
  // track). A subtle inline indicator, not a warning toast: this is a common,
  // non-fatal, expected outcome, not something to interrupt the user over.
  const callAudioMissing = useSyncExternalStore(
    subscribeCallAudio,
    getCallAudioMissing,
    getCallAudioMissingServerSnapshot,
  );
  const showCallAudioMissing =
    isRecordingActive && callAudioMissing && (mode === 'system' || mode === 'both');
  // Read when the indicator shows: whether the share failed or attached
  // silent, and which surface was shared, decide what the user should fix.
  const callAudioMissingReason = showCallAudioMissing ? callAudioHint(getMeetingDiagnostics()?.capture ?? null) : '';
  const modelReady = modelReadiness === 'ready';
  // Only a model that is actively downloading/loading disables Record. When it
  // is missing or failed, the button becomes the way to get it: clicking it
  // opens the download dialog (see `startRecording`), instead of a disabled
  // button pointing at a Settings screen the user has to find.
  const modelPreparing = modelReadiness === 'downloading' || modelReadiness === 'loading';
  const needsModel = !isRecordingActive && !modelReady && !modelPreparing;
  const recordDisabled = !isRecordingActive && !modelReady && modelPreparing;
  // Every blocked state has to say something true: this used to collapse all
  // of them into "Download the speech model first", which was actively wrong
  // for a download that had already failed.
  const recordTooltip = !modelReady
    ? modelProgress.stage
      ? modelProgress.detail
        ? `${modelProgress.label} — ${modelProgress.detail}`
        : modelProgress.label
      : modelReadiness === 'failed'
        ? t('modelFailedTip')
        : t('modelMissingTip')
    : t('recordTip');

  // Elapsed recording time, tracked locally: the capture pipeline reads `mode`
  // once at start (see MeetingView's startRecording), so this dock owns its own
  // clock rather than needing a startedAt prop threaded down for it.
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [wasActive, setWasActive] = useState(isRecordingActive);
  const lastTickRef = useRef<number | null>(null);
  const elapsedSeconds = Math.floor(accumulatedMs / 1000);

  // A recording starting from idle restarts the clock at zero. Adjusting
  // state during render (rather than in an effect) means the first frame of
  // the new recording already shows 0.
  if (wasActive !== isRecordingActive) {
    setWasActive(isRecordingActive);
    if (isRecordingActive) setAccumulatedMs(0);
  }

  useEffect(() => {
    if (!isLive) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current ?? now);
      lastTickRef.current = now;
      setAccumulatedMs((ms) => ms + delta);
    }, 250);
    return () => clearInterval(id);
  }, [isLive]);

  return (
    <nav
      ref={dockRef}
      className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-max max-w-[calc(100%-32px)] -translate-x-1/2 select-none sm:bottom-6"
      aria-label={t('recordingControls')}
    >
      {/* The reason is announced from a polite live region that exists before
          the message does. It cannot sit inside the indicator button: a
          button's children are presentational and are never announced. */}
      <span role="status" className="sr-only">
        {showCallAudioMissing ? `${t('noCallAudio')}. ${callAudioMissingReason}` : ''}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[26px] border border-border-subtle bg-surface/90 p-1.5 shadow-elevation-3 backdrop-blur-md">
        {/* Recording group: Record, which becomes Stop + clock, then pause once it runs. */}
        <div className="flex shrink-0 items-center gap-1">
          {isRecordingActive ? (
            <>
              <Button
                variant="ghost"
                size="md"
                onClick={onStop}
                disabled={isStopping}
                loading={isStopping}
                tooltip={t('stopTip')}
                aria-label={`${t('stop')}, ${formatElapsed(elapsedSeconds)}${isPaused ? `, ${t('paused')}` : ''}`}
                leadingIcon={<Square className="!size-3.5 fill-current" />}
                className={`btn-record-spring shrink-0 tabular-nums ${ROUND} ${STOP_TINT}`}
              >
                <span role="timer">{formatElapsed(elapsedSeconds)}</span>
              </Button>
              <Button
                variant="ghost"
                size="md"
                iconOnly
                onClick={isPaused ? onResume : onPause}
                tooltip={isPaused ? t('resumeTip') : t('pauseTip')}
                aria-label={isPaused ? t('resume') : t('pause')}
                leadingIcon={
                  isPaused ? (
                    <Play className="ml-0.5 fill-current text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Pause className="fill-current" />
                  )
                }
                className={`shrink-0 ${ROUND}`}
              />
            </>
          ) : (
            <Button
              variant={needsModel ? 'ghost' : 'danger'}
              size="md"
              onClick={onStart}
              disabled={recordDisabled}
              tooltip={recordTooltip}
              aria-label={needsModel ? t('downloadModel') : recordTooltip}
              leadingIcon={needsModel ? <Download /> : <Circle className="!size-3 fill-current" />}
              className={`btn-record-spring shrink-0 whitespace-nowrap ${ROUND} ${needsModel ? MODEL_TINT : ''}`}
            >
              {needsModel ? t('downloadModel') : t('record')}
            </Button>
          )}
        </div>

        <Divider orientation="vertical" className="mx-1 hidden h-6 w-px shrink-0 sm:block" />

        {/* Input group: what is recorded, and from which microphone. Both are
            locked while recording: the capture pipeline reads `mode` and the
            device once at start (see MeetingView's startRecording). */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Tabs value={mode === 'system' ? 'both' : mode} onValueChange={(value) => onModeChange(value as CaptureMode)} size="md" variant="pill">
            <TabList aria-label={t('audioSource')} className={`${ROUND} [&>[data-indicator]]:!rounded-full`}>
              {/* Tab forwards no handlers, so the tooltip trigger is a wrapper element:
                  hover and focus (focusin bubbles) both reach it. One tooltip per
                  option: while locked, the lock hint is part of that option's text. */}
              <Tooltip content={isRecordingActive ? t('micTipLocked') : t('micTip')}>
                <span className="inline-flex">
                  <Tab value="mic" disabled={isRecordingActive} className={`gap-1.5 ${ROUND}`}>
                    <Mic aria-hidden="true" />
                    <span className="sr-only md:not-sr-only">{t('mic')}</span>
                  </Tab>
                </span>
              </Tooltip>
              <Tooltip content={isRecordingActive ? t('micCallTipLocked') : t('micCallTip')}>
                <span className="inline-flex">
                  <Tab value="both" disabled={isRecordingActive} className={`gap-1.5 whitespace-nowrap ${ROUND}`}>
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
            locked={isRecordingActive}
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
      </div>
    </nav>
  );
}
