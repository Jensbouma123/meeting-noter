import { useState } from 'react';
import { useRecordingControls } from './useRecordingControls';
import { useStartInSession } from './useStartInSession';
import { useStartRecording } from './useStartRecording';
import type { RecordingFlowParams, TargetPrompt } from '../types';

export function useRecordingFlow(params: RecordingFlowParams) {
  const { initialSessionId, settings, modelReady, modelReadiness, status, title, setTitle, setResumeCandidate } =
    params;
  const [langOverride, setLangOverride] = useState<string | null>(null);
  const [targetPrompt, setTargetPrompt] = useState<TargetPrompt | null>(null);
  const [participantsPrompt, setParticipantsPrompt] = useState(false);

  const { startRecording, markParticipantsAnswered } = useStartRecording({
    initialSessionId, settings, modelReady, modelReadiness, status, title,
    setTargetPrompt, setParticipantsPrompt, setLangOverride, setResumeCandidate,
  });
  const startInSession = useStartInSession({
    initialSessionId, settings, setTitle, setTargetPrompt, setLangOverride, setResumeCandidate,
  });
  const controls = useRecordingControls(setLangOverride);

  const answerParticipants = () => {
    markParticipantsAnswered();
    setParticipantsPrompt(false);
    void startRecording();
  };

  return {
    ...controls,
    langOverride,
    targetPrompt,
    setTargetPrompt,
    participantsPrompt,
    startRecording,
    startInSession,
    answerParticipants,
  };
}
