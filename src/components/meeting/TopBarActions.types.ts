import type { SettingsSectionId } from '@/components/settings/sections';

export interface TopBarActionsProps {
  onOpenSettings: (section?: SettingsSectionId) => void;
  onClearTranscript?: () => void;
  clearDisabled: boolean;
  onOpenShare?: () => void;
  updateAvailable: boolean;
  modelFailed: boolean;
}
