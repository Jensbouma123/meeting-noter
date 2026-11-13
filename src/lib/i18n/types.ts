import type { translations } from './index';

export type Language = 'en' | 'nl';

export type Namespace = keyof typeof translations;

export type TranslationKey<N extends Namespace> = string & keyof (typeof translations)[N]['en'];

export interface UsedKey {
  file: string;
  key: string;
  prefix: boolean;
  namespaces: Namespace[];
}
