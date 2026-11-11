'use client';

import { useContext } from 'react';
import { LanguageContext, type Language } from './LanguageContext';
import { t, type Namespace } from './index';

export function getDefaultLanguage(browserLanguage?: string): Language {
  return browserLanguage?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function useT<N extends Namespace>(namespace: N) {
  const language = useContext(LanguageContext) ?? getDefaultLanguage(
    typeof navigator === 'undefined' ? undefined : navigator.language,
  );
  return (key: string) => t(namespace, key, language);
}
