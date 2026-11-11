'use client';

import { createContext } from 'react';

export type Language = 'en' | 'nl';

export const LanguageContext = createContext<Language | null>(null);
export const SetLanguageContext = createContext<((language: Language) => void) | null>(null);
