import type { SettingsSectionId } from '@/components/settings/types';
import type { AppSettings } from './types';

export interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  section?: SettingsSectionId | 'speech-model';
}
