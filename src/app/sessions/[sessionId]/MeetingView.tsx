'use client';

import { useCallback, useRef, useState } from 'react';
import { VStack, useToast } from '@jensbouma123/acciva-ui';
import { useUpdate } from '@/components/update/useUpdate';
import { ModelRegistryProvider } from '@/components/models';
import { useMeeting, TopBar } from '@/components/meeting';
import { getTranscriptSessionId } from '@/lib/meeting/store';
import { clearSessionTranscript } from '@/lib/meeting/session-store';
import { useServerHeartbeat } from '@/lib/lifecycle/useServerHeartbeat';
import { useT } from '@/lib/i18n/useT';
import { MeetingBanners } from './components/MeetingBanners';
import { MeetingDialogs } from './components/MeetingDialogs';
import { MeetingWorkspace } from './components/MeetingWorkspace';
import { useAsrBannerState } from './hooks/useAsrBannerState';
import { useAutosave } from './hooks/useAutosave';
import { useCrashRecovery } from './hooks/useCrashRecovery';
import { useDemoAutoStart } from './hooks/useDemoAutoStart';
import { useHydratedSessionState } from './hooks/useHydratedSessionState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMeetingToasts } from './hooks/useMeetingToasts';
import { useModelStatus } from './hooks/useModelStatus';
import { useOtherRecordingGuard } from './hooks/useOtherRecordingGuard';
import { useRecordingControls } from './hooks/useRecordingControls';
import { useSessionEdits } from './hooks/useSessionEdits';
import { useSettingsDialog } from './hooks/useSettingsDialog';
import { useStartInSession } from './hooks/useStartInSession';
import { useStartRecording } from './hooks/useStartRecording';
import type { MeetingViewProps } from './MeetingView.types';
import type { BannerKind, TargetPrompt } from './types';

export default function MeetingView({ initialSessionId }: MeetingViewProps) {
  const t = useT('meeting');
  const { toast } = useToast();
  const status = useMeeting((s) => s.status);
  const startedAt = useMeeting((s) => s.startedAt);
  const segments = useMeeting((s) => s.segments);
  const speakers = useMeeting((s) => s.speakers);
  const stats = useMeeting((s) => s.stats);
  const error = useMeeting((s) => s.error);
  const warning = useMeeting((s) => s.warning);
  const language = useMeeting((s) => s.language);

  const model = useModelStatus();
  const { modelReadiness, modelProgress, modelReady, asrEnabled, asrPhase, postStop } = model;
  const { title, setTitle, settings, setSettings, resumeCandidate, setResumeCandidate } =
    useHydratedSessionState(initialSessionId);
  const { settingsOpen, setSettingsOpen, settingsSection, openSettings } = useSettingsDialog();
  const otherRecording = useOtherRecordingGuard(initialSessionId);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const [targetPrompt, setTargetPrompt] = useState<TargetPrompt | null>(null);
  const [participantsPrompt, setParticipantsPrompt] = useState(false);
  const participantsAnswered = useRef(false);

  const { changeTitle, changeSettings, changeMode } = useSessionEdits({
    initialSessionId, settings, setTitle, setSettings,
  });
  const startRecording = useStartRecording({
    initialSessionId, settings, modelReady, modelReadiness, status, title,
    participantsAnswered, setTargetPrompt, setParticipantsPrompt, setLangOverride, setResumeCandidate,
  });
  const startInSession = useStartInSession({
    initialSessionId, settings, setTitle, setTargetPrompt, setLangOverride, setResumeCandidate,
  });
  const { stopRecording, pauseRecording, resumeRecording, pickLanguage } = useRecordingControls(setLangOverride);

  useAutosave({ initialSessionId, title, segments, speakers, startedAt });
  useCrashRecovery({
    initialSessionId, resumeCandidate, setResumeCandidate, setTitle, segmentCount: segments.length, status,
  });
  useKeyboardShortcuts({
    status, modelReady, helpOpen, settingsOpen, setHelpOpen, setSettingsOpen,
    pauseRecording, resumeRecording, startRecording, stopRecording,
  });
  useDemoAutoStart(startRecording);

  const isRecording = status === 'live' || status === 'paused';
  const { asrProblem, asrPostStop, postStopDetail } = useAsrBannerState({
    isRecording, asrEnabled, asrPhase, postStop,
  });
  useMeetingToasts({
    error, warning, modelPreparing: Boolean(modelProgress.stage), modelReadiness, asrProblem,
  });

  const clearTranscript = useCallback(() => {
    if (!initialSessionId) return;
    if (clearSessionTranscript(initialSessionId)) toast({ title: t('transcriptCleared'), variant: 'success' });
    else toast({ title: t('stopFirst'), variant: 'warning' });
  }, [initialSessionId, toast, t]);

  const update = useUpdate(isRecording);
  const updateAvailable = update.status === 'available' && update.info?.latest !== update.dismissedVersion;
  useServerHeartbeat(isRecording);

  const effectiveLang = langOverride ?? settings.language;
  const shareSessionId = initialSessionId ?? getTranscriptSessionId() ?? 'active';
  const otherBanner = !!(initialSessionId && otherRecording && getTranscriptSessionId() !== initialSessionId);
  const banner: BannerKind = otherBanner ? 'other' : asrProblem ? 'problem' : asrPostStop ? 'postStop' : null;
  const answerParticipants = () => {
    participantsAnswered.current = true;
    setParticipantsPrompt(false);
    void startRecording();
  };

  return (
    <ModelRegistryProvider>
      <VStack spacing="none" fill className="h-full w-full max-w-full overflow-hidden bg-background text-foreground">
        <TopBar
          title={title}
          onTitleChange={changeTitle}
          status={status}
          startedAt={startedAt}
          stats={stats}
          language={language}
          languageAuto={effectiveLang === 'auto'}
          selectedLang={effectiveLang}
          onPickLanguage={pickLanguage}
          onOpenSettings={openSettings}
          modelReadiness={modelReadiness}
          modelProgress={modelProgress}
          onClearTranscript={initialSessionId ? clearTranscript : undefined}
          clearDisabled={status !== 'idle' && status !== 'error'}
          onOpenShare={() => setShareOpen(true)}
          updateAvailable={updateAvailable}
          modelFailed={modelReadiness === 'failed'}
        />
        <MeetingBanners
          banner={banner}
          asrProblem={asrProblem}
          asrPostStop={asrPostStop}
          asrPhase={asrPhase}
          postStop={postStop}
          postStopDetail={postStopDetail}
          onOpenSettings={openSettings}
        />
        <MeetingWorkspace
          sessionId={shareSessionId}
          segments={segments}
          speakers={speakers}
          status={status}
          settings={settings}
          modelReady={modelReady}
          modelReadiness={modelReadiness}
          modelProgress={modelProgress}
          onStart={startRecording}
          onStop={stopRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onOpenSettings={openSettings}
          onModeChange={changeMode}
          onSettingsChange={changeSettings}
        />
        <MeetingDialogs
          title={title}
          segments={segments}
          speakers={speakers}
          settings={settings}
          onSettingsChange={changeSettings}
          settingsOpen={settingsOpen}
          settingsSection={settingsSection}
          onCloseSettings={() => setSettingsOpen(false)}
          shareOpen={shareOpen}
          onCloseShare={() => setShareOpen(false)}
          helpOpen={helpOpen}
          onCloseHelp={() => setHelpOpen(false)}
          prompts={{
            initialSessionId,
            ownerName: settings.ownerName,
            showParticipants: participantsPrompt,
            targetPrompt,
            onParticipantsAnswered: answerParticipants,
            onCancelTarget: () => setTargetPrompt(null),
            onAppend: () => void startInSession('append'),
            onStartNew: () => void startInSession('new'),
          }}
        />
      </VStack>
    </ModelRegistryProvider>
  );
}
