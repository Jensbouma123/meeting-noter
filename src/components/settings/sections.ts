import { Bot, Database, Info, SpellCheck, SlidersHorizontal } from 'lucide-react';
import type { SettingsSectionId, SettingsSectionMeta } from './types';

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  { id: 'general', label: 'section.general', icon: SlidersHorizontal },
  { id: 'vocabulary', label: 'section.vocabulary', icon: SpellCheck },
  { id: 'storage', label: 'section.storage', icon: Database },
  { id: 'about', label: 'section.about', icon: Info },
  { id: 'assistant', label: 'section.assistant', icon: Bot },
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
    return DEFAULT_SETTINGS_SECTION;
  }
  return DEFAULT_SETTINGS_SECTION;
}

export function saveLastSettingsSection(section: SettingsSectionId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SECTION_STORAGE_KEY, section);
  } catch {
    return;
  }
}
