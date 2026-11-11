import { common } from './ns/common';
import { dialogs } from './ns/dialogs';
import { dock } from './ns/dock';
import { home } from './ns/home';
import { lifecycle } from './ns/lifecycle';
import { meeting } from './ns/meeting';
import { models } from './ns/models';
import { notes } from './ns/notes';
import { rail } from './ns/rail';
import { settings } from './ns/settings';
import { share } from './ns/share';
import { sidebar } from './ns/sidebar';
import { summary } from './ns/summary';
import { topbar } from './ns/topbar';
import { transcript } from './ns/transcript';
import { update } from './ns/update';
import type { Language } from './LanguageContext';

export const translations = {
  common,
  dialogs,
  dock,
  home,
  lifecycle,
  meeting,
  models,
  notes,
  rail,
  settings,
  share,
  sidebar,
  summary,
  topbar,
  transcript,
  update,
} as const;

export type Namespace = keyof typeof translations;
export type TranslationKey<N extends Namespace> = string & keyof (typeof translations)[N]['en'];

export function t<N extends Namespace>(namespace: N, key: string, language: Language): string {
  const table = translations[namespace] as Record<Language, Record<string, string>>;
  return table[language][key] ?? table.en[key] ?? key;
}
