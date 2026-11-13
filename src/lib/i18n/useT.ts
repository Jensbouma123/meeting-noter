'use client';

import { useContext } from 'react';
import { t } from './index';
import { LanguageContext } from './LanguageContext';
import type { Language, Namespace } from './types';

export function getDefaultLanguage(browserLanguage?: string): Language {
  return browserLanguage?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

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
