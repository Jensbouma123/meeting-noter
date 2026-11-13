import type { ComponentType, ReactNode } from 'react';
import type { AppSettings } from '@/components/meeting/types';
import type { VocabularyEntry } from '@/lib/vocabulary/types';

export type SettingsSectionId = 'general' | 'vocabulary' | 'storage' | 'about' | 'advanced';

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface SettingsSectionProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  alertSections?: SettingsSectionId[];
  children: ReactNode;
}

export interface SettingsGroupProps {
  children: ReactNode;
}

export interface SettingsRowProps {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  htmlFor?: string;
}

export interface SettingsStackedRowProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export interface VocabularyRowProps {
  entry: VocabularyEntry;
}

export interface VocabularyAddFieldProps {
  id: string;
  children?: ReactNode;
  notice?: string | null;
  onNotice?: (notice: string | null) => void;
  placeholder?: string;
  onAdded?: (words: string[]) => void;
}

export interface VocabularyFileMenuProps {
  entries: VocabularyEntry[];
  onChooseFile: () => void;
}

export interface VariantEditorProps {
  entry: VocabularyEntry;
}
