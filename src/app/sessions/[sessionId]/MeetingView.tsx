'use client';

import { useState } from 'react';
import { VStack } from '@jensbouma123/acciva-ui';
import { ModelRegistryProvider } from '@/components/models';
import { useMeeting, TopBar } from '@/components/meeting';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { MeetingBanners } from './components/MeetingBanners';
import { MeetingDialogs } from './components/MeetingDialogs';
import { MeetingWorkspace } from './components/MeetingWorkspace';
import { useAutosave } from './hooks/useAutosave';
import { useCrashRecovery } from './hooks/useCrashRecovery';
import { useDemoAutoStart } from './hooks/useDemoAutoStart';
import { useHydratedSessionState } from './hooks/useHydratedSessionState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useClearTranscript } from './hooks/useClearTranscript';
import { useMeetingBannerState } from './hooks/useMeetingBannerState';
import { useUpdateAvailable } from './hooks/useUpdateAvailable';
import { useModelStatus } from './hooks/useModelStatus';
import { useOtherRecordingGuard } from './hooks/useOtherRecordingGuard';
import { useRecordingFlow } from './hooks/useRecordingFlow';
import { useSessionEdits } from './hooks/useSessionEdits';
import { useSettingsDialog } from './hooks/useSettingsDialog';
import type { MeetingViewProps } from './MeetingView.types';

export default function MeetingView({ initialSessionId }: MeetingViewProps) {
  const status = useMeeting((s) => s.status);
  const startedAt = useMeeting((s) => s.startedAt);
  const segments = useMeeting((s) => s.segments);
  const speakers = useMeeting((s) => s.speakers);
  const stats = useMeeting((s) => s.stats);
  const error = useMeeting((s) => s.error);
  const warning = useMeeting((s) => s.warning);
  const language = useMeeting((s) => s.language);

  const { modelReadiness, modelProgress, modelReady, asrEnabled, asrPhase, postStop } = useModelStatus();
  const { title, setTitle, settings, setSettings, resumeCandidate, setResumeCandidate } =
    useHydratedSessionState(initialSessionId);
  const { settingsOpen, setSettingsOpen, settingsSection, openSettings } = useSettingsDialog();
  const otherRecording = useOtherRecordingGuard(initialSessionId);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { changeTitle, changeSettings, changeMode } = useSessionEdits({
    initialSessionId, settings, setTitle, setSettings,
  });
  const {
    langOverride, targetPrompt, setTargetPrompt, participantsPrompt, startRecording, startInSession,
    answerParticipants, stopRecording, pauseRecording, resumeRecording, pickLanguage,
  } = useRecordingFlow({
    initialSessionId, settings, modelReady, modelReadiness, status, title, setTitle, setResumeCandidate,
  });

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
  const { banner, asrProblem, asrPostStop, postStopDetail } = useMeetingBannerState({
    initialSessionId, otherRecording, error, warning, modelProgress, modelReadiness, isRecording,
    asrEnabled, asrPhase, postStop,
  });
  const clearTranscript = useClearTranscript(initialSessionId);
  const updateAvailable = useUpdateAvailable(isRecording);
  const effectiveLang = langOverride ?? settings.language;
  const shareSessionId = initialSessionId ?? getTranscriptSessionId() ?? 'active';

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
