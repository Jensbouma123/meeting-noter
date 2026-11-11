'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LanguageContext, SetLanguageContext, type Language } from './LanguageContext';
import { getDefaultLanguage } from './useT';

const SETTINGS_KEY = 'mn.settings';

function readLanguage(): Language {
  try {
    const settings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}');
    if (settings.language === 'en' || settings.language === 'nl') return settings.language;
  } catch {
    // Invalid or unavailable settings use the browser preference.
  }
  return getDefaultLanguage(navigator.language);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Reading localStorage during render would break SSR hydration, so the stored language is applied after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguage(readLanguage());
    const sync = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY) setLanguage(readLanguage());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  return <LanguageContext.Provider value={language}><SetLanguageContext.Provider value={setLanguage}>{children}</SetLanguageContext.Provider></LanguageContext.Provider>;
}
