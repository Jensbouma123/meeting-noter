import { useState } from 'react';
import { useMeeting } from '@/components/meeting';
import { getTranscriptSessionId } from '@/lib/meeting/transcript-session';
import { useAutosave } from './useAutosave';
import { useClearTranscript } from './useClearTranscript';
import { useCrashRecovery } from './useCrashRecovery';
import { useDemoAutoStart } from './useDemoAutoStart';
import { useHydratedSessionState } from './useHydratedSessionState';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useMeetingBannerState } from './useMeetingBannerState';
import { useModelStatus } from './useModelStatus';
import { useOtherRecordingGuard } from './useOtherRecordingGuard';
import { useRecordingFlow } from './useRecordingFlow';
import { useSessionEdits } from './useSessionEdits';
import { useSettingsDialog } from './useSettingsDialog';
import { useUpdateAvailable } from './useUpdateAvailable';

export function useMeetingViewState(initialSessionId?: string) {
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
    initialSessionId,
    settings,
    setTitle,
    setSettings,
  });
  const {
    langOverride,
    targetPrompt,
    setTargetPrompt,
    participantsPrompt,
    startRecording,
    startInSession,
    answerParticipants,
    stopRecording,
    pauseRecording,
    resumeRecording,
    pickLanguage,
  } = useRecordingFlow({
    initialSessionId,
    settings,
    modelReady,
    modelReadiness,
    status,
    title,
    setTitle,
    setResumeCandidate,
  });

  useAutosave({ initialSessionId, title, segments, speakers, startedAt });
  useCrashRecovery({
    initialSessionId,
    resumeCandidate,
    setResumeCandidate,
    setTitle,
    segmentCount: segments.length,
    status,
  });
  useKeyboardShortcuts({
    status,
    modelReady,
    helpOpen,
    settingsOpen,
    setHelpOpen,
    setSettingsOpen,
    pauseRecording,
    resumeRecording,
    startRecording,
    stopRecording,
  });
  useDemoAutoStart(startRecording);

  const isRecording = status === 'live' || status === 'paused';
  const { banner, asrProblem, asrPostStop, postStopDetail } = useMeetingBannerState({
    initialSessionId,
    otherRecording,
    error,
    warning,
    modelProgress,
    modelReadiness,
    isRecording,
    asrEnabled,
    asrPhase,
    postStop,
  });
  const clearTranscript = useClearTranscript(initialSessionId);
  const updateAvailable = useUpdateAvailable(isRecording);
  const effectiveLang = langOverride ?? settings.language;
  const shareSessionId = initialSessionId ?? getTranscriptSessionId() ?? 'active';

  return {
    initialSessionId,
    status,
    startedAt,
    segments,
    speakers,
    stats,
    language,
    title,
    settings,
    changeTitle,
    changeSettings,
    changeMode,
    settingsOpen,
    settingsSection,
    setSettingsOpen,
    openSettings,
    modelReady,
    modelReadiness,
    modelProgress,
    asrPhase,
    postStop,
    banner,
    asrProblem,
    asrPostStop,
    postStopDetail,
    clearTranscript,
    updateAvailable,
    effectiveLang,
    shareSessionId,
    helpOpen,
    setHelpOpen,
    shareOpen,
    setShareOpen,
    participantsPrompt,
    targetPrompt,
    setTargetPrompt,
    answerParticipants,
    startRecording,
    startInSession,
    stopRecording,
    pauseRecording,
    resumeRecording,
    pickLanguage,
  };
}
