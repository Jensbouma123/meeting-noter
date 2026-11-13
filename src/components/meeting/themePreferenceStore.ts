import { THEME_PREFERENCE_KEY } from './themeSwitcherConstants';
import type { ThemePreference } from './ThemeSwitcher.types';

const listeners = new Set<() => void>();
let memoryPreference: ThemePreference | null = null;

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    return 'system';
  }
  return 'system';
}

export function subscribePreference(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getPreferenceSnapshot(): ThemePreference {
  return memoryPreference ?? readStoredPreference();
}

export function getServerPreferenceSnapshot(): ThemePreference | null {
  return null;
}

export function storePreference(next: ThemePreference) {
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, next);
    memoryPreference = null;
  } catch {
    memoryPreference = next;
  }
  listeners.forEach((notify) => notify());
}
