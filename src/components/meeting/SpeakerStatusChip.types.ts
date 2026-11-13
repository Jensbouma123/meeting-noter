import type { DiarizationStatus } from '@/lib/meeting/types';
import type { SettingsSectionId } from '@/components/settings/types';

export interface SpeakerStatusChipProps {
  status: DiarizationStatus | undefined;
  onOpenSettings: (section?: SettingsSectionId) => void;
}
