import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AppSettings } from '@/components/meeting';
import type { AutosavedSession } from '@/lib/meeting/types/autosave';
import type { getPostStopTranscriptionProgress, Segment, Speaker } from '@/lib/meeting';
import type { getState } from '@/lib/meeting/store';
import type { deriveModelReadiness } from '@/components/meeting/modelReadiness';

import type { BrowserASRPhase } from '@/lib/asr/browser/types';

export interface TargetPrompt {
  title: string;
  durationSeconds: number;
}

export type BannerKind = 'other' | 'problem' | 'postStop' | null;

export type PostStopProgress = ReturnType<typeof getPostStopTranscriptionProgress>;

export type MeetingStatus = ReturnType<typeof getState>['status'];

export type ModelReadiness = ReturnType<typeof deriveModelReadiness>;

export interface StartRecordingParams {
  initialSessionId?: string;
  settings: AppSettings;
  modelReady: boolean;
  modelReadiness: ModelReadiness;
  status: MeetingStatus;
  title: string;
  participantsAnswered: MutableRefObject<boolean>;
  setTargetPrompt: Dispatch<SetStateAction<TargetPrompt | null>>;
  setParticipantsPrompt: Dispatch<SetStateAction<boolean>>;
  setLangOverride: Dispatch<SetStateAction<string | null>>;
  setResumeCandidate: Dispatch<SetStateAction<AutosavedSession | null>>;
}

export interface MeetingBannerStateParams {
  initialSessionId?: string;
  otherRecording: boolean;
  error: string | null;
  warning: string | null;
  modelProgress: { stage?: unknown };
  modelReadiness: ModelReadiness;
  isRecording: boolean;
  asrEnabled: boolean;
  asrPhase: BrowserASRPhase;
  postStop: PostStopProgress;
}

export interface RecordingFlowParams {
  initialSessionId?: string;
  settings: AppSettings;
  modelReady: boolean;
  modelReadiness: ModelReadiness;
  status: MeetingStatus;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  setResumeCandidate: Dispatch<SetStateAction<AutosavedSession | null>>;
}

export interface AutosaveParams {
  initialSessionId?: string;
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  startedAt: number | null;
}

export interface CrashRecoveryParams {
  initialSessionId?: string;
  resumeCandidate: AutosavedSession | null;
  setResumeCandidate: Dispatch<SetStateAction<AutosavedSession | null>>;
  setTitle: Dispatch<SetStateAction<string>>;
  segmentCount: number;
  status: MeetingStatus;
}

export interface KeyboardShortcutsParams {
  status: MeetingStatus;
  modelReady: boolean;
  helpOpen: boolean;
  settingsOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

export interface StartInSessionParams {
  initialSessionId?: string;
  settings: AppSettings;
  setTitle: Dispatch<SetStateAction<string>>;
  setTargetPrompt: Dispatch<SetStateAction<TargetPrompt | null>>;
  setLangOverride: Dispatch<SetStateAction<string | null>>;
  setResumeCandidate: Dispatch<SetStateAction<AutosavedSession | null>>;
}
