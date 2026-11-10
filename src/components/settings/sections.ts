import type { ComponentType } from 'react';
import {
  Cpu,
  Database,
  Info,
  Keyboard,
  Languages,
  Mic,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';

export type SettingsSectionId =
  | 'general'
  | 'audio'
  | 'transcription'
  | 'speech-model'
  | 'appearance'
  | 'shortcuts'
  | 'storage'
  | 'about';

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'transcription', label: 'Transcription', icon: Languages },
  { id: 'speech-model', label: 'Speech model', icon: Cpu },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'storage', label: 'Storage', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'general';

const SECTION_STORAGE_KEY = 'mn.settings.section';

export function loadLastSettingsSection(): SettingsSectionId {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS_SECTION;
  try {
    const raw = localStorage.getItem(SECTION_STORAGE_KEY);
    if (raw && SETTINGS_SECTIONS.some((s) => s.id === raw)) {
      return raw as SettingsSectionId;
    }
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
