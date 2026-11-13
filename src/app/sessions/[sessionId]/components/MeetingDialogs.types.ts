import type { AppSettings } from '@/components/meeting';
import type { SettingsSectionId } from '@/components/settings/types';
import type { Segment, Speaker } from '@/lib/meeting';
import type { RecordingPromptsProps } from './RecordingPrompts.types';

export interface MeetingDialogsProps {
  title: string;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  settingsOpen: boolean;
  settingsSection?: SettingsSectionId;
  onCloseSettings: () => void;
  shareOpen: boolean;
  onCloseShare: () => void;
  helpOpen: boolean;
  onCloseHelp: () => void;
  prompts: RecordingPromptsProps;
}
