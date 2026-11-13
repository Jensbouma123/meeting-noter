import type { Language } from './types';
import { getDefaultLanguage } from './useLanguage';

const SETTINGS_KEY = 'mn.settings';

let override: Language | null = null;
const listeners = new Set<() => void>();

function readLanguage(): Language {
  try {
    const settings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}');
    if (settings.language === 'en' || settings.language === 'nl') return settings.language;
  } catch {}
  return getDefaultLanguage(navigator.language);
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  const sync = (event: StorageEvent) => {
    if (event.key !== SETTINGS_KEY) return;
    override = null;
    emit();
  };
  window.addEventListener('storage', sync);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', sync);
  };
}

export function getLanguageSnapshot(): Language {
  return override ?? readLanguage();
}

export function getServerLanguageSnapshot(): Language {
  return 'en';
}

export function setLanguage(language: Language) {
  override = language;
  emit();
}
