'use client';

import { createContext } from 'react';

export type Language = 'en' | 'nl';

export const LanguageContext = createContext<Language | null>(null);
