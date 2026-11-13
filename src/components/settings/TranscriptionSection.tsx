'use client';

import { Select } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { SettingsSectionProps } from './types';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function TranscriptionSection({
  settings,
  onSettingsChange,
}: SettingsSectionProps) {
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
  );
}
