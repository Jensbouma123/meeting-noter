'use client';

import { createContext } from 'react';
import type { Language } from './types';

export const LanguageContext = createContext<Language | null>(null);
export const SetLanguageContext = createContext<((language: Language) => void) | null>(null);
