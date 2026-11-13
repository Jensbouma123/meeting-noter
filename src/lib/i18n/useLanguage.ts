'use client';

import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import type { Language } from './types';

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
