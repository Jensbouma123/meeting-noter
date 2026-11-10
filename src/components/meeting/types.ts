import type { CaptureMode, SystemVia } from '@/lib/meeting';

export interface AppSettings {
  mode: CaptureMode;
  systemVia: SystemVia;
  micDeviceId: string;
  language: string;
  autoScroll: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'both',
  systemVia: 'native',
  micDeviceId: 'default',
  language: 'auto',
  autoScroll: true,
};

export const SETTINGS_STORAGE_KEY = 'mn.settings';
export const TITLE_STORAGE_KEY = 'mn.title';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode ?? DEFAULT_SETTINGS.mode,
      systemVia: parsed.systemVia ?? DEFAULT_SETTINGS.systemVia,
      micDeviceId: parsed.micDeviceId ?? DEFAULT_SETTINGS.micDeviceId,
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      autoScroll: parsed.autoScroll ?? DEFAULT_SETTINGS.autoScroll,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage write failures
  }
}

export function loadSavedTitle(): string {
  if (typeof window === 'undefined') return 'Untitled meeting';
  try {
    return localStorage.getItem(TITLE_STORAGE_KEY) || 'Untitled meeting';
  } catch {
    return 'Untitled meeting';
  }
}

export function saveTitle(title: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TITLE_STORAGE_KEY, title);
  } catch {
    // Ignore localStorage write failures
  }
}
