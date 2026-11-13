import type { LanguageInfo, Status } from '@/lib/meeting';
import type { SettingsSectionId } from '@/components/settings/sections';
import type { ModelProgressView, ModelReadiness } from './modelReadiness';

export interface TopBarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  status: Status;
  startedAt: number | null;
  stats: { rtf: number; lagMs: number; rssMb: number } | null;
  language: LanguageInfo | null;
  meetingDate?: number | null;
  languageAuto: boolean;
  selectedLang: string;
  onPickLanguage: (code: string) => void;
  onOpenSettings: (section?: SettingsSectionId) => void;
  modelReadiness: ModelReadiness;
  modelProgress: ModelProgressView;
  onClearTranscript?: () => void;
  clearDisabled?: boolean;
  onOpenShare?: () => void;
  updateAvailable?: boolean;
  modelFailed?: boolean;
}
