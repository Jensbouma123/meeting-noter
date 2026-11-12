import type { CaptureMode, SystemVia } from '@/lib/meeting';
import { DEFAULT_RETENTION, parseRetention, type RetentionChoice } from '@/lib/meeting/retention';

export interface AppSettings {
  mode: CaptureMode;
  systemVia: SystemVia;
  micDeviceId: string;
  language: string;
  autoScroll: boolean;
  /** Meetings older than this are deleted at app start. */
  retention: RetentionChoice;
  /** The user's own name. Stored only; assigning it to a speaker comes later. */
  ownerName: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'both',
  systemVia: 'native',
  micDeviceId: 'default',
  language: 'auto',
  autoScroll: true,
  retention: DEFAULT_RETENTION,
  ownerName: '',
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
      // Call-only is no longer selectable; a saved 'system' preference becomes 'both'.
      mode: parsed.mode === 'system' ? 'both' : (parsed.mode ?? DEFAULT_SETTINGS.mode),
      systemVia: parsed.systemVia ?? DEFAULT_SETTINGS.systemVia,
      micDeviceId: parsed.micDeviceId ?? DEFAULT_SETTINGS.micDeviceId,
      language: parsed.language ?? DEFAULT_SETTINGS.language,
      autoScroll: parsed.autoScroll ?? DEFAULT_SETTINGS.autoScroll,
      retention: parseRetention(parsed.retention),
      ownerName: typeof parsed.ownerName === 'string' ? parsed.ownerName : '',
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
