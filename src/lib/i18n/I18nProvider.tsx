'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { LanguageContext, SetLanguageContext } from './LanguageContext';
import { getLanguageSnapshot, getServerLanguageSnapshot, setLanguage, subscribeLanguage } from './languageStore';

export function I18nProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  return <LanguageContext.Provider value={language}><SetLanguageContext.Provider value={setLanguage}>{children}</SetLanguageContext.Provider></LanguageContext.Provider>;
}
