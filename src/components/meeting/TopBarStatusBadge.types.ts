import type { Status } from '@/lib/meeting';
import type { SettingsSectionId } from '@/components/settings/sections';
import type { ModelProgressView, ModelReadiness } from './modelReadiness';

export interface TopBarStatusBadgeProps {
  t: (key: string) => string;
  status: Status;
  modelReadiness: ModelReadiness;
  modelProgress: ModelProgressView;
  onOpenSettings: (section?: SettingsSectionId) => void;
}
