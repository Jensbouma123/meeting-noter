'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getCallAudioMissing, getMeetingDiagnostics, subscribeCallAudio, type CaptureMode, type Status } from '@/lib/meeting';
import { callAudioHint } from '@/lib/meeting/call-audio-hint';
import { LevelMeter } from './LevelMeter';
import { captureDebugEnabled, setCaptureDebug } from './CaptureDiagnostics';
import { useReleaseOnUnmount } from './useReleaseOnUnmount';
import type { ModelProgressView, ModelReadiness } from './modelReadiness';
import { Activity, Download, Mic, Pause, Play, Square, Volume2, VolumeX, PhoneCall, Bug } from 'lucide-react';
import {
  Button,
  Divider,
  HStack,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  useToast,
} from '@jensbouma123/acciva-ui';

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
}: BottomDockProps) {
  const { toast } = useToast();
  const [metersOpen, setMetersOpen] = useState(false);
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
  // The meters have nothing to show outside an active recording (no signal
  // flowing yet during "connecting"/"stopping"), so keep the pill hidden
  // until there's actually live/paused audio to visualize.
  const showMeters = isLive || isPaused;
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
        ? "The speech model didn't load. Open Settings › Speech model to try again."
        : 'Download the speech model to start recording'
    : 'Start recording (R)';

  // Elapsed recording time, tracked locally: the capture pipeline reads `mode`
  // once at start (see MeetingView's startRecording), so this dock owns its own
  // clock rather than needing a startedAt prop threaded down for it.
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const accumulatedMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (isRecordingActive && !wasActiveRef.current) {
      accumulatedMsRef.current = 0;
      setElapsedSeconds(0);
    }
    wasActiveRef.current = isRecordingActive;
  }, [isRecordingActive]);

  useEffect(() => {
    if (!isLive) return;
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current ?? now);
      lastTickRef.current = now;
      accumulatedMsRef.current += delta;
      setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [isLive]);

  // Auto-close meters popover on outside click or Escape
  useEffect(() => {
    if (!metersOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMetersOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setMetersOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [metersOpen]);

  return (
    <nav
      ref={dockRef}
      className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 max-w-[calc(100%-32px)] -translate-x-1/2 select-none sm:bottom-6"
      aria-label="Recording controls"
    >
      {/* Floating meters popover on mobile behind tap */}
      {showMeters && metersOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 -translate-x-1/2 animate-fade-in">
          <LevelMeter mode={mode} active={isLive} callMissing={showCallAudioMissing} />
        </div>
      )}

      <HStack
        spacing="sm"
        align="center"
        className="gap-2 rounded-full border border-border bg-surface/90 px-3 py-2 shadow-elevation-3 backdrop-blur-md transition-transform duration-180 sm:gap-4 sm:px-5 sm:py-2.5"
      >
        {/* Record / Stop Button */}
        <div className="relative flex shrink-0 items-center">
          {isLive && (
            <div
              className="animate-breathing-ring pointer-events-none absolute inset-0 rounded-full bg-danger/20"
              aria-hidden="true"
            />
          )}

          {isRecordingActive ? (
            <Button
              variant="danger"
              size="md"
              onClick={onStop}
              disabled={isStopping}
              loading={isStopping}
              tooltip="Stop recording (R)"
              aria-label={`Stop recording, ${formatElapsed(elapsedSeconds)} elapsed`}
              leadingIcon={<Square className="size-3.5 fill-current" />}
              className="btn-record-spring relative z-10 !rounded-full tabular-nums"
            >
              {formatElapsed(elapsedSeconds)}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              onClick={onStart}
              disabled={recordDisabled}
              tooltip={recordTooltip}
              aria-label={
                needsModel
                  ? 'Download the speech model'
                  : recordDisabled
                    ? `Start recording, ${recordTooltip}`
                    : 'Start recording'
              }
              leadingIcon={needsModel ? <Download className="size-4" /> : <Mic className="size-4" />}
              className="btn-record-spring relative z-10 !rounded-full hover:scale-[1.02] active:scale-95"
            >
              {needsModel ? 'Download model' : 'Record'}
            </Button>
          )}
        </div>

        {/* Pause / Resume Button */}
        {isRecordingActive && (
          <Button
            variant="secondary"
            size={{ base: 'md', md: 'sm' }}
            iconOnly
            onClick={isPaused ? onResume : onPause}
            tooltip={isPaused ? 'Resume recording (Space)' : 'Pause recording (Space)'}
            leadingIcon={
              isPaused ? (
                <Play className="ml-0.5 size-4 fill-current text-primary" />
              ) : (
                <Pause className="size-4 fill-current" />
              )
            }
            className="touch-target-44 !rounded-full active:scale-95"
          />
        )}

        <Divider orientation="vertical" className="hidden h-5 w-px shrink-0 sm:block" />

        {/* Source selector (Mic / Call / Both) — a segmented control, locked while
            a recording is active since the capture pipeline reads `mode` once at
            start (see MeetingView's startRecording) and never re-reads it live. */}
        {(() => {
          const tabs = (
            <Tabs value={mode} onValueChange={(value) => onModeChange(value as CaptureMode)} size="sm" variant="pill">
              <TabList aria-label="Audio source">
                <Tab value="mic" disabled={isRecordingActive} className="touch-target-44">
                  <HStack as="span" spacing="xs" className="items-center">
                    <Mic className="size-3.5" />
                    <span className="sr-only sm:not-sr-only">Mic</span>
                  </HStack>
                </Tab>
                <Tab value="system" disabled={isRecordingActive} className="touch-target-44">
                  <HStack as="span" spacing="xs" className="items-center">
                    <Volume2 className="size-3.5" />
                    <span className="sr-only sm:not-sr-only">Call</span>
                  </HStack>
                </Tab>
                <Tab value="both" disabled={isRecordingActive} className="touch-target-44">
                  <HStack as="span" spacing="xs" className="items-center">
                    <PhoneCall className="size-3.5" />
                    <span className="sr-only sm:not-sr-only">Both</span>
                  </HStack>
                </Tab>
              </TabList>
            </Tabs>
          );
          return isRecordingActive ? (
            <Tooltip content="Stop recording to change the audio source">
              <div>{tabs}</div>
            </Tooltip>
          ) : (
            tabs
          );
        })()}

        {showCallAudioMissing && (
          <HStack spacing="xs" align="center" className="shrink-0 gap-1">
            <Tooltip content={callAudioMissingReason} side="top">
              <button
                type="button"
                role="alert"
                aria-label={`No call audio. ${callAudioMissingReason}`}
                onClick={() => toast.warning(callAudioMissingReason, { title: "Call audio isn't being recorded" })}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
              >
                <VolumeX className="size-3.5" />
                No call audio
              </button>
            </Tooltip>
            <Tooltip content="Show capture diagnostics" side="top">
              <button
                type="button"
                aria-label="Show capture diagnostics"
                onClick={() => setCaptureDebug(!captureDebugEnabled())}
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <Bug className="size-3.5" />
              </button>
            </Tooltip>
          </HStack>
        )}

        {showMeters && (
          <>
            {/* Desktop inline level meters */}
            <div className="hidden shrink-0 sm:block">
              <LevelMeter mode={mode} active={isLive} callMissing={showCallAudioMissing} />
            </div>

            {/* Mobile tap trigger for meters */}
            <Button
              variant="secondary"
              size={{ base: 'md', md: 'sm' }}
              iconOnly
              onClick={() => setMetersOpen((prev) => !prev)}
              tooltip={metersOpen ? 'Hide audio levels' : 'Show audio levels'}
              leadingIcon={<Activity className="size-3.5" />}
              aria-expanded={metersOpen}
              className="touch-target-44 !rounded-full sm:hidden"
            />
          </>
        )}
      </HStack>
    </nav>
  );
}
