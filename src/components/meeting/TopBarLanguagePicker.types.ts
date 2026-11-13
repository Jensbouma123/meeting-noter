import type { LanguageInfo } from '@/lib/meeting';

export interface TopBarLanguagePickerProps {
  language: LanguageInfo;
  selectedLang: string;
  onPickLanguage: (code: string) => void;
}
