'use client';

import { Select } from '@jensbouma123/acciva-ui';
import type { AppSettings } from '@/components/meeting/types';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { VocabularySection } from './VocabularySection';

export function TranscriptionSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const t = useT('settings');
  const languageOptions = [
    { value: 'auto', label: t('autoDetect') },
    { value: 'en', label: t('english') },
    { value: 'nl', label: t('dutch') },
    { value: 'de', label: t('german') },
    { value: 'fr', label: t('french') },
    { value: 'es', label: t('spanish') },
    { value: 'it', label: t('italian') },
    { value: 'pt', label: t('portuguese') },
    { value: 'ja', label: t('japanese') },
  ];
  return (
    <>
      <SettingsGroup>
        <SettingsRow
          label={t('spokenLanguage')}
          description={t('spokenLanguageDescription')}
          control={
            <Select
              options={languageOptions}
              value={settings.language}
              onChange={(language) => onSettingsChange({ ...settings, language })}
              aria-label={t('spokenLanguage')}
            />
          }
        />
      </SettingsGroup>
      <VocabularySection />
    </>
  );
}
