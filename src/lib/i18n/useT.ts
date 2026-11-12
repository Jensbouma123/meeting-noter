'use client';

import { useContext } from 'react';
import { LanguageContext, type Language } from './LanguageContext';
import { t, type Namespace } from './index';

export function getDefaultLanguage(browserLanguage?: string): Language {
  return browserLanguage?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

/** The language the interface is in: the provider's, or the browser's until it mounts. */
export function useLanguage(): Language {
  const context = useContext(LanguageContext);
  return (
    context ??
    getDefaultLanguage(typeof navigator === 'undefined' ? undefined : navigator.language)
  );
}

export function useT<N extends Namespace>(namespace: N) {
  const language = useLanguage();
  return (key: string) => t(namespace, key, language);
}
