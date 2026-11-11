'use client';

import { sessionPath } from '@/lib/session-path';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import type { CaptureMode } from '@/lib/meeting';
import {
  restoreSnapshot,
  bindTranscriptSession,
  getTranscriptSessionId,
  loadIdleSession,
  getState,
  cancelAppend,
} from '@/lib/meeting/store';
import {
  sessionExists,
  openSession,
  unmarkDraft,
  setSessionCaptureMode,
  persistSession,
  archiveAutosavedSession,
  renameSession,
  getSessionMetadata,
  sessionHasTranscript,
  startRecordingInSession,
  clearSessionTranscript,
} from '@/lib/meeting/session-store';
import {
  loadAutosavedSession,
  scheduleAutosave,
  clearAutosavedSession,
  flushAutosave,
  getClientSessionId,
  type AutosavedSession,
} from '@/lib/meeting/persist';
import {
  useMeeting,
  meeting,
  TopBar,
  RightRail,
  LiveTranscript,
  BottomDock,
  SettingsSheet as MeetingSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadSavedTitle,
  saveTitle,
  type AppSettings,
} from '@/components/meeting';
import { RecordTargetDialog } from '@/components/meeting/RecordTargetDialog';
import { CaptureDiagnostics } from '@/components/meeting/CaptureDiagnostics';
import { ShortcutsHelp } from '@/components/meeting/ShortcutsHelp';
import type { SettingsSectionId } from '@/components/settings/sections';
import { MicOff } from 'lucide-react';
import {
  ModelRegistryProvider,
  subscribeRegistry,
  getState as getModelRegistryState,
  getServerSnapshot as getModelRegistryServerSnapshot,
} from '@/components/models';
import {
  getBrowserASRProgress,
  getBrowserASRStatusMessage,
  getServerBrowserASRProgress,
  enableBrowserASR,
  subscribeBrowserASR,
  warmBrowserASR,
  promptBrowserASRDownload,
  getPostStopTranscriptionProgress,
  getServerPostStopProgress,
  subscribePostStopTranscription,
} from '@/lib/meeting';
import { deriveModelProgress, deriveModelReadiness } from '@/components/meeting/modelReadiness';
import type { BrowserASRPhase } from '@/lib/asr/browser/types';
import { Alert, Button, HStack, Text, useToast, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { ShareDialog } from '@/components/share/ShareDialog';
import { useUpdate } from '@/components/update/useUpdate';
import { useServerHeartbeat } from '@/lib/lifecycle/useServerHeartbeat';
import { getNotes, type Notes } from '@/lib/meeting/notes';

const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

/* -------------------------------------------------------------------------- */
/* Meeting view — used as the page under /sessions/[sessionId]                */
/* -------------------------------------------------------------------------- */

interface MeetingViewProps {
  /** When present, this session ID is restored from the session index. */
  initialSessionId?: string;
}

export default function MeetingView({ initialSessionId }: MeetingViewProps) {
  const router = useRouter();
  const t = useT('meeting');
  // Store subscriptions via narrow selectors
  const status = useMeeting((s) => s.status);
  const startedAt = useMeeting((s) => s.startedAt);
  const segments = useMeeting((s) => s.segments);
  const speakers = useMeeting((s) => s.speakers);
  const stats = useMeeting((s) => s.stats);
  const error = useMeeting((s) => s.error);
  const warning = useMeeting((s) => s.warning);
  const language = useMeeting((s) => s.language);

  // Speech model readiness — the registry is a module-level observable
  // (see @/components/models), not part of the meeting store.
  const modelRegistryState = useSyncExternalStore(
    subscribeRegistry,
    getModelRegistryState,
    getModelRegistryServerSnapshot
  );
  const modelEntries = useMemo(
    () => Object.values(modelRegistryState.entries),
    [modelRegistryState]
  );
  // Files being cached in IndexedDB is not the same as the ONNX session being
  // initialized and usable — subscribe to the real engine state (browser-asr
  // owns it) so "ready" isn't reported prematurely, and so a model that never
  // loads has a phase, a percentage and a message to show instead of silence.
  //
  // One snapshot object rather than the previous `enabled|phase` string: it
  // carries the phase, whether ASR is on, *and* the measured preparation
  // progress, and it is referentially stable between changes (see
  // `getBrowserASRProgress`) so `useSyncExternalStore` doesn't loop.
  const browserASR = useSyncExternalStore(
    subscribeBrowserASR,
    getBrowserASRProgress,
    getServerBrowserASRProgress
  );
  const asrEnabledBool = browserASR.enabled;
  const asrPhase: BrowserASRPhase = browserASR.phase;

  // The post-stop job's own progress (a device with no usable WebGPU
  // transcribes the finished recording instead of the live stream). A
  // separate store from the model's preparation: this one is a real
  // chunk-of-the-recording count, and it keeps ticking long after the model
  // load is done.
  const postStop = useSyncExternalStore(
    subscribePostStopTranscription,
    getPostStopTranscriptionProgress,
    getServerPostStopProgress
  );

  const modelReadiness = useMemo(
    () => deriveModelReadiness(modelEntries, { enabled: asrEnabledBool, phase: asrPhase }),
    [modelEntries, asrEnabledBool, asrPhase]
  );
  const modelProgress = useMemo(
    () => deriveModelProgress(modelEntries, browserASR),
    [modelEntries, browserASR]
  );
  const modelReady = modelReadiness === 'ready';

  // Transcription is on-device and is the app's only engine, so it is enabled
  // explicitly here rather than relying on a settings toggle nobody sets.
  // Idempotent; keeps a `disableBrowserASR()` (e.g. left over from a failed
  // session) from silently turning Record into a mute button.
  useEffect(() => {
    enableBrowserASR();
  }, []);

  // Proactively warm the engine once files are cached, instead of waiting for
  // the first transcription frame of a live session, so Record isn't enabled
  // before the model is actually usable.
  useEffect(() => {
    if (modelReadiness === 'loading' || (asrEnabledBool && modelEntries.every((e) => e.status === 'cached'))) {
      warmBrowserASR();
    }
  }, [modelReadiness, asrEnabledBool, modelEntries]);

  // Local persistent state
  // Initial state must match the server render; stored values load after mount.
  const [title, setTitle] = useState('Untitled meeting');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | undefined>();
  const openSettings = useCallback((section?: SettingsSectionId) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);
  // Mid-session language override; null = follow settings.
  const [langOverride, setLangOverride] = useState<string | null>(null);
  // Crash-recovery candidate for the "Resume last session" banner.
  const [resumeCandidate, setResumeCandidate] = useState<AutosavedSession | null>(null);
  const { toast, dismiss } = useToast();
  // Armed only by a real preparing → ready transition, so a model that was
  // already ready on page load doesn't toast a confirmation nobody asked for.
  const wasPreparingRef = useRef(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from localStorage */
    setTitle(
      initialSessionId
        ? (getSessionMetadata(initialSessionId)?.title ?? 'Untitled meeting')
        : loadSavedTitle(),
    );
    setSettings(loadSettings());
    try {
      // Offer to resume only this session's own snapshot: a crash-recovery
      // copy of another session must not follow the user into a new one.
      const candidate = loadAutosavedSession();
      setResumeCandidate(
        candidate && (!initialSessionId || candidate.sessionId === initialSessionId) ? candidate : null,
      );
    } catch {
      // Best-effort only.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialSessionId]);

  // Load the session's own transcript on mount / route change. Refused while
  // another session is live or stopping: the store keeps that recording's
  // transcript bound to its own id, so it is never shown as this session.
  const [otherRecording, setOtherRecording] = useState(false);
  useEffect(() => {
    if (!initialSessionId) return;
    try {
      if (getTranscriptSessionId() === initialSessionId) {
        setOtherRecording(false); // eslint-disable-line react-hooks/set-state-in-effect
        return;
      }
      const saved = sessionExists(initialSessionId) ? openSession(initialSessionId) : null;
      const loaded = loadIdleSession(
        initialSessionId,
        saved && { segments: saved.segments, speakers: saved.speakers, startedAt: saved.startedAt ?? null },
      );
      setOtherRecording(!loaded);
    } catch {
      // Best-effort — the live path must never break.
    }
  }, [initialSessionId]);

  // Keyboard shortcuts help overlay.
  const [helpOpen, setHelpOpen] = useState(false);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (initialSessionId) {
      try {
        renameSession(initialSessionId, newTitle);
      } catch {
        // Best-effort.
      }
    } else {
      saveTitle(newTitle);
    }
  }, [initialSessionId]);

  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleModeChange = useCallback(
    (newMode: CaptureMode) => {
      const updated = { ...settings, mode: newMode };
      setSettings(updated);
      saveSettings(updated);
    },
    [settings]
  );

  // Record pressed in a session that already has a transcript: ask first.
  const [targetPrompt, setTargetPrompt] = useState<{
    title: string;
    segmentCount: number;
    durationSeconds: number;
  } | null>(null);

  const startOptions = useMemo(
    () => ({
      mode: settings.mode,
      micDeviceId: settings.micDeviceId === 'default' ? undefined : settings.micDeviceId,
      language: settings.language === 'auto' ? undefined : settings.language,
      systemVia: settings.systemVia,
    }),
    [settings],
  );

  const startInSession = useCallback(
    async (target: 'append' | 'new') => {
      if (!initialSessionId) return;
      setTargetPrompt(null);
      setLangOverride(null);
      setResumeCandidate(null);
      let id: string | null = null;
      try {
        id = startRecordingInSession(initialSessionId, target);
      } catch {
        id = null;
      }
      if (!id) {
        toast({ title: t('couldNotContinue'), variant: 'warning' });
        return;
      }
      try {
        unmarkDraft(id);
        setSessionCaptureMode(id, settings.mode);
      } catch {
        // Best-effort.
      }
      let started: Promise<void> | undefined;
      try {
        // Called synchronously from the button click to keep user activation.
        started = meeting.start(startOptions);
        if (target === 'new') {
          setTitle('Untitled meeting');
          router.push(sessionPath(id));
        }
        await started;
      } catch {
        // Handled via store state
      }
      if (target === 'append' && getState().status === 'idle') cancelAppend();
    },
    [initialSessionId, startOptions, settings.mode, router, toast],
  );

  const startRecording = useCallback(async () => {
    // Defence in depth: the Record button, R shortcut, and empty-state CTA
    // all check `modelReady` before calling this. When the model isn't
    // usable, open the download dialog rather than returning in silence —
    // this used to be a bare `return`, which made every one of those entry
    // points a no-op with no explanation of why.
    if (!modelReady) {
      if (modelReadiness !== 'loading' && modelReadiness !== 'downloading') {
        promptBrowserASRDownload();
      }
      return;
    }
    if (initialSessionId && status === 'idle' && sessionHasTranscript(initialSessionId)) {
      const meta = getSessionMetadata(initialSessionId);
      const live = getTranscriptSessionId() === initialSessionId ? getState() : null;
      setTargetPrompt({
        title: meta?.title ?? title,
        segmentCount: meta?.segmentCount ?? live?.segments.length ?? 0,
        durationSeconds: meta?.durationSeconds ?? 0,
      });
      return;
    }
    setLangOverride(null);
    // A brand-new session replaces any crash-recovery snapshot.
    setResumeCandidate(null);
    try {
      flushAutosave();
      archiveAutosavedSession();
      const s = getState();
      if (initialSessionId && s.segments.length > 0 && getTranscriptSessionId() === initialSessionId) {
        persistSession({
          sessionId: initialSessionId,
          segments: s.segments,
          speakers: s.speakers,
          startedAt: s.startedAt,
        });
      }
      bindTranscriptSession(initialSessionId ?? getClientSessionId());
      clearAutosavedSession();
    } catch {
      // Best-effort only.
    }
    // Unmark the draft flag so the session shows as active in the sidebar.
    try {
      if (initialSessionId) {
        unmarkDraft(initialSessionId);
        setSessionCaptureMode(initialSessionId, settings.mode);
      }
    } catch {
      // Best-effort.
    }
    try {
      await meeting.start({
        mode: settings.mode,
        micDeviceId: settings.micDeviceId === 'default' ? undefined : settings.micDeviceId,
        language: settings.language === 'auto' ? undefined : settings.language,
        systemVia: settings.systemVia,
      });
    } catch {
      // Handled via store state
    }
  }, [settings, modelReady, modelReadiness, initialSessionId, status, title]);

  const stopRecording = useCallback(async () => {
    await meeting.stop();
    // Persist the final transcript immediately so nothing is lost
    // if the tab closes right after stopping.
    try {
      flushAutosave();
      const s = getState();
      const id = getTranscriptSessionId();
      if (id) {
        persistSession({
          sessionId: id,
          title: getSessionMetadata(id)?.title,
          segments: s.segments,
          speakers: s.speakers,
          startedAt: s.startedAt,
        });
      }
    } catch {
      // Best-effort only.
    }
  }, []);

  const pauseRecording = useCallback(() => {
    meeting.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    meeting.resume();
  }, []);

  const handlePickLanguage = useCallback((code: string) => {
    setLangOverride(code);
    meeting.setLanguage(code);
  }, []);

  const effectiveLang = langOverride ?? settings.language;

  // Crash-safe autosave: persist finals-only snapshot (throttled ~1 s).
  useEffect(() => {
    try {
      // Save under the store's bound session, not the route: a post-stop
      // transcription for A must keep writing under A after navigating to B.
      const boundId = getTranscriptSessionId();
      if (!boundId) return;
      const boundTitle =
        boundId === initialSessionId ? title : (getSessionMetadata(boundId)?.title ?? 'Untitled meeting');
      scheduleAutosave({
        sessionId: boundId,
        title: boundTitle,
        segments,
        speakers,
        startedAt,
      });
    } catch {
      // Best-effort only; the live path must never break.
    }
  }, [segments, speakers, title, startedAt, initialSessionId]);

  const handleResumeSession = useCallback(() => {
    if (!resumeCandidate) return;
    try {
      restoreSnapshot(
        resumeCandidate.segments,
        resumeCandidate.speakers,
        resumeCandidate.startedAt
      );
      bindTranscriptSession(resumeCandidate.sessionId);
      setTitle(resumeCandidate.title);
      if (initialSessionId) renameSession(initialSessionId, resumeCandidate.title);
      else saveTitle(resumeCandidate.title);
    } catch {
      // Best-effort restore.
    }
    setResumeCandidate(null);
  }, [resumeCandidate, initialSessionId]);

  // Offer crash recovery as a toast, and only when that meeting is not the one
  // already on screen (its transcript is loaded, so there is nothing to restore).
  const candidateOnScreen =
    resumeCandidate !== null &&
    segments.length > 0 &&
    getTranscriptSessionId() === resumeCandidate.sessionId;
  const showResume = resumeCandidate !== null && status === 'idle' && !candidateOnScreen;
  useEffect(() => {
    if (!showResume || !resumeCandidate) return;
    const lines = resumeCandidate.segments.length;
    const id = toast.info(
      fill(t('restoreBody'), {
        title: resumeCandidate.title,
        lines: fill(t(lines === 1 ? 'restoreLineOne' : 'restoreLineMany'), { n: lines }),
      }),
      {
        title: t('restoreTitle'),
        action: { label: t('restore'), onClick: handleResumeSession },
      },
    );
    return () => dismiss(id);
  }, [showResume, resumeCandidate, handleResumeSession, toast, dismiss, t]);

  // Keyboard shortcuts: R record/stop, Space pause/resume, Esc close sheets,
  // Cmd/Ctrl+F search, Cmd/Ctrl+E export, ? help. Ignored while typing.
  // mn:search / mn:export are CustomEvents the transcript side listens for.
  useEffect(() => {
    const isTypingTarget = (): boolean => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      try {
        if (el.isContentEditable) return true;
      } catch {
        // Ignore.
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc closes sheets even while typing.
      if (e.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
        }
        return;
      }

      if (isTypingTarget()) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mn:search'));
        return;
      }
      if (mod && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mn:export'));
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === '?') {
        setHelpOpen(true);
        return;
      }

      if (e.code === 'Space' && (status === 'live' || status === 'paused')) {
        e.preventDefault();
        if (status === 'live') pauseRecording();
        else resumeRecording();
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
        if (status === 'idle' || status === 'error') {
          if (modelReady) void startRecording();
        } else if (status === 'live' || status === 'paused') {
          void stopRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    status,
    pauseRecording,
    resumeRecording,
    startRecording,
    stopRecording,
    helpOpen,
    settingsOpen,
    modelReady,
  ]);

  // Auto-start recording on load in mock mode when ?demo=1 is present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        const timer = setTimeout(() => {
          startRecording();
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Safe fallback
    }
  }, [startRecording]);

  // Is the engine going to produce a transcript for this recording? Shown
  // *while recording*, not only before it: pressing Record must never look
  // like it worked while nothing is being transcribed. `blocked` (model not
  // downloaded) and `failed` (download or load error) both carry a message
  // and an action from `browser-asr.ts`; `loading`/`downloading` are ordinary
  // progress and get the preparing banner below instead.
  const isRecording = status === 'live' || status === 'paused';
  const asrProblem = useMemo((): string | null => {
    if (!isRecording || !asrEnabledBool) return null;
    if (asrPhase !== 'blocked' && asrPhase !== 'failed') return null;
    return getBrowserASRStatusMessage() ?? t('unavailable');
  }, [isRecording, asrEnabledBool, asrPhase, t]);

  // Live transcription is off on this device — not because anything failed,
  // but because its CPU model needs 1.41 s of compute per second of audio.
  // Stated while recording, because "no live transcript" read as a bug during
  // the meeting it was happening in; and stated with the truth that follows
  // it: the recording is safe and is transcribed when the user stops it.
  const asrPostStop = useMemo((): string | null => {
    if (!asrEnabledBool || asrPhase !== 'post-stop') return null;
    return getBrowserASRStatusMessage();
  }, [asrEnabledBool, asrPhase]);

  // …and the one phase that is progress rather than explanation: the finished
  // recording being transcribed, chunk by chunk. The percentage is real
  // (chunks done / chunks total), never a timer.
  const postStopTranscribing = postStop?.phase === 'transcribing';
  const postStopPercent = postStop?.percent ?? null;
  const postStopDetail =
    postStop === null || postStop.phase === 'recording'
      ? null
      : postStop.phase === 'done'
        ? t('transcriptReady')
        : postStop.phase === 'error'
          ? fill(t('finishFailed'), { reason: postStop.error ?? t('finishFailedGeneric') })
          : fill(t('part'), { n: postStop.chunksDone + 1, total: postStop.chunksTotal });

  // Transient recording error/warning — informational, not a decision the
  // user has to make, so it's a toast rather than a banner that sits on
  // screen until dismissed.
  useEffect(() => {
    if (error) toast.danger(error, { title: t('recordingError') });
  }, [error, toast, t]);

  useEffect(() => {
    if (warning) toast.warning(warning);
  }, [warning, toast]);

  // "Model ready" — the transient confirmation that the preparation
  // percentage actually reached 100%. Skipped when a bigger problem
  // (`asrProblem`) is already showing, same as the banner it replaces.
  useEffect(() => {
    if (modelProgress.stage) {
      wasPreparingRef.current = true;
      return;
    }
    if (!wasPreparingRef.current || modelReadiness !== 'ready') return;
    wasPreparingRef.current = false;
    if (asrProblem) return;
    toast.success(t('modelReadyTitle'), { description: t('modelReadyBody') });
  }, [modelProgress.stage, modelReadiness, asrProblem, toast, t]);

  const handleClearTranscript = useCallback(() => {
    if (!initialSessionId) return;
    if (clearSessionTranscript(initialSessionId)) toast({ title: t('transcriptCleared'), variant: 'success' });
    else toast({ title: t('stopFirst'), variant: 'warning' });
  }, [initialSessionId, toast, t]);

  // Share dialog: notes are read once when it opens (localStorage-backed).
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotes, setShareNotes] = useState<Notes>({ actions: [], decisions: [] });
  const shareSessionId = initialSessionId ?? getTranscriptSessionId() ?? 'active';
  const openShare = useCallback(() => {
    setShareNotes(getNotes(shareSessionId));
    setShareOpen(true);
  }, [shareSessionId]);
  const shareParticipants = useMemo(
    () => Object.values(speakers).map((sp) => sp.label),
    [speakers],
  );
  const shareDurationS = useMemo(() => {
    const ends = segments.map((sg) => sg.end).filter((n) => Number.isFinite(n));
    return ends.length ? Math.max(...ends) : 0;
  }, [segments]);
  const [mountedAt] = useState(() => Date.now());
  const shareDate = useMemo(
    () => new Date(startedAt ?? mountedAt).toLocaleDateString(),
    [startedAt, mountedAt],
  );

  const update = useUpdate(isRecording);
  const updateAvailable =
    update.status === 'available' && update.info?.latest !== update.dismissedVersion;
  useServerHeartbeat(isRecording);

  // One banner at a time, most urgent first.
  const otherBanner = !!(initialSessionId && otherRecording && getTranscriptSessionId() !== initialSessionId);
  const banner: 'other' | 'problem' | 'postStop' | null = otherBanner
    ? 'other'
    : asrProblem
      ? 'problem'
      : asrPostStop
        ? 'postStop'
        : null;

  return (
    <ModelRegistryProvider>
      <VStack spacing="none" fill className="h-full w-full max-w-full overflow-hidden bg-background text-foreground">
      {/* Top Header */}
      <TopBar
        title={title}
        onTitleChange={handleTitleChange}
        status={status}
        startedAt={startedAt}
        stats={stats}
        language={language}
        languageAuto={effectiveLang === 'auto'}
        selectedLang={effectiveLang}
        onPickLanguage={handlePickLanguage}
        onOpenSettings={openSettings}
        modelReadiness={modelReadiness}
        modelProgress={modelProgress}
        onClearTranscript={initialSessionId ? handleClearTranscript : undefined}
        clearDisabled={status !== 'idle' && status !== 'error'}
        onOpenShare={openShare}
        updateAvailable={updateAvailable}
        modelFailed={modelReadiness === 'failed'}
      />

      {banner === 'other' && (
        <Alert
          variant="warning"
          layout="banner"
          role="status"
          title={t('otherTitle')}
          className="rounded-none max-sm:[&_p]:line-clamp-2"
        >
          {fill(t('otherBody'), {
            title: getSessionMetadata(getTranscriptSessionId() ?? '')?.title ?? t('otherFallback'),
          })}
        </Alert>
      )}

      {/* Transcription unavailable for this recording. Audio is still being
          captured, so this is stated as a warning with the action to fix it
          rather than an error that implies the meeting stopped. It is also
          not dismissible: a recording that silently transcribes nothing is
          the failure this whole path exists to make visible. */}
      {banner === 'problem' && (
        <Alert
          variant="warning"
          layout="banner"
          role="status"
          title={t('notTranscribingTitle')}
          icon={<MicOff className="size-5" />}
          action={
            <Button
              size={{ base: 'md', md: 'sm' }}
              variant="secondary"
              onClick={() =>
                asrPhase === 'blocked' ? promptBrowserASRDownload() : openSettings('advanced')
              }
            >
              {asrPhase === 'blocked' ? t('downloadModel') : t('openSettings')}
            </Button>
          }
          className="rounded-none max-sm:[&_p]:line-clamp-2"
        >
          {asrProblem} {t('stillRecording')}
        </Alert>
      )}

      {/* Live transcription is not available on this device. An `info` banner,
          not a `warning`: nothing is broken and nothing is lost — the CPU
          model is simply too slow to transcribe while the meeting runs, so the
          recording is captured and transcribed on Stop. The progress bar is
          the same one from the post-stop store that drives the work. */}
      {banner === 'postStop' && (
        <Alert variant="info" layout="banner" role="status" title={t('postStopTitle')} className="rounded-none max-sm:[&_p]:line-clamp-2">
          <VStack spacing="xs" className="w-full">
            <Text as="span" size="xs" variant="muted">{asrPostStop}.</Text>
            {postStopTranscribing && (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevation-2">
                  {postStopPercent === null ? (
                    <div
                      className="h-full w-full rounded-full bg-primary-500/40 motion-safe:animate-pulse"
                      role="progressbar"
                      aria-label={t('transcribingLabel')}
                    />
                  ) : (
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${postStopPercent}%` }}
                      role="progressbar"
                      aria-valuenow={postStopPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t('transcribingLabel')}
                    />
                  )}
                </div>
                {postStopDetail && (
                  <Text as="span" size="xs" variant="muted" className="tabular-nums">
                    {t('transcribing')}{postStopPercent === null ? '' : ` ${postStopPercent}%`}
                    {` · ${postStopDetail}`}
                  </Text>
                )}
              </>
            )}
            {postStop?.phase === 'done' && (
              <Text as="span" size="xs" variant="muted">{postStopDetail}</Text>
            )}
            {postStop?.phase === 'error' && (
              <Text as="span" size="xs" variant="danger">{postStopDetail}</Text>
            )}
            {postStop !== null && postStop.droppedSeconds > 0 && (
              <Text as="span" size="xs" variant="muted">
                {fill(t('dropped'), { s: Math.round(postStop.droppedSeconds) })}
              </Text>
            )}
          </VStack>
        </Alert>
      )}

      {/* Main Workspace Area — transcript column + speaker sidebar */}
      <HStack
        as="div"
        spacing="none"
        align="stretch"
        fill
        className="w-full max-w-full overflow-hidden"
      >
        {/* Transcript column — the record dock is centered on this column
            alone (not the full viewport), so it never overlaps the
            speaker sidebar. */}
        <VStack
          spacing="none"
          fill
          className="relative min-w-0 w-full max-w-full overflow-hidden"
        >
          <LiveTranscript
            sessionId={shareSessionId}
            segments={segments}
            speakers={speakers}
            status={status}
            autoScrollEnabled={settings.autoScroll}
            systemVia={settings.systemVia}
            onStartRecording={startRecording}
            modelReady={modelReady}
            modelReadiness={modelReadiness}
            onOpenSettings={openSettings}
          />

          {/* Centered Bottom Dock */}
          <BottomDock
            status={status}
            mode={settings.mode}
            modelReadiness={modelReadiness}
            modelProgress={modelProgress}
            onModeChange={handleModeChange}
            onStart={startRecording}
            onStop={stopRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onOpenAdvanced={() => openSettings('advanced')}
          />
          <CaptureDiagnostics />
        </VStack>

        {/* Speaker sidebar — manages its own open/collapsed state. */}
        <RightRail sessionId={shareSessionId} segments={segments} />
      </HStack>

      {/* Settings dialog */}
      <MeetingSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        section={settingsSection}
      />

      {targetPrompt && (
        <RecordTargetDialog
          open
          {...targetPrompt}
          onCancel={() => setTargetPrompt(null)}
          onAppend={() => void startInSession('append')}
          onStartNew={() => void startInSession('new')}
        />
      )}

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        date={shareDate}
        durationS={shareDurationS}
        participants={shareParticipants}
        decisions={shareNotes.decisions}
        actions={shareNotes.actions}
        segments={segments}
        speakers={speakers}
      />

      {/* Keyboard Shortcuts Help Overlay */}
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </VStack>
    </ModelRegistryProvider>
  );
}
