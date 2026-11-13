import type { AppSettings } from '@/components/meeting';
import type { deriveModelProgress } from '@/components/meeting/modelProgress';
import type { SettingsSectionId } from '@/components/settings/types';
import type { CaptureMode, Segment, Speaker } from '@/lib/meeting';
import type { MeetingStatus, ModelReadiness } from '../types';

export interface MeetingWorkspaceProps {
  sessionId: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  status: MeetingStatus;
  settings: AppSettings;
  modelReady: boolean;
  modelReadiness: ModelReadiness;
  modelProgress: ReturnType<typeof deriveModelProgress>;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onPause: () => void;
  onResume: () => void;
  onOpenSettings: (section?: SettingsSectionId) => void;
  onModeChange: (mode: CaptureMode) => void;
  onSettingsChange: (settings: AppSettings) => void;
}
