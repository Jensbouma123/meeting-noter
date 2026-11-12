import type { ComponentType } from 'react';
import {
  Database,
  Info,
  SpellCheck,
  SlidersHorizontal,
} from 'lucide-react';

export type SettingsSectionId = 'general' | 'vocabulary' | 'storage' | 'about' | 'advanced';

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  /** Settings-namespace i18n key (render with `useT('settings')`), not display text. */
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  { id: 'general', label: 'section.general', icon: SlidersHorizontal },
  { id: 'vocabulary', label: 'section.vocabulary', icon: SpellCheck },
  { id: 'storage', label: 'section.storage', icon: Database },
  { id: 'about', label: 'section.about', icon: Info },
  { id: 'advanced', label: 'section.advanced', icon: SlidersHorizontal },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'general';

const SECTION_STORAGE_KEY = 'mn.settings.section';

export function loadLastSettingsSection(): SettingsSectionId {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS_SECTION;
  try {
    const raw = localStorage.getItem(SECTION_STORAGE_KEY);
    if (raw === 'speech-model') return 'advanced';
    if (raw && SETTINGS_SECTIONS.some((s) => s.id === raw)) return raw as SettingsSectionId;
  } catch {
    // localStorage unavailable — fall back to the default.
  }
  return DEFAULT_SETTINGS_SECTION;
}

export function saveLastSettingsSection(section: SettingsSectionId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SECTION_STORAGE_KEY, section);
  } catch {
    // Ignore write failures — the section just won't be remembered.
  }
}
