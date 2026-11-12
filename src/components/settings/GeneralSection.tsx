'use client';

import { Input, Select, Switch } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { SetLanguageContext, type Language } from '@/lib/i18n/LanguageContext';
import { useContext } from 'react';
import { AudioCaptureSection } from './AudioCaptureSection';
import { AppearanceSection } from './AppearanceSection';
import type { AppSettings } from '@/components/meeting/types';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function GeneralSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  const t = useT('settings');
  const setLanguage = useContext(SetLanguageContext);
  const language = settings.language === 'nl' || settings.language === 'en'
    ? settings.language
    : typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
  return (
    <>
      <SettingsGroup>
        <SettingsRow
          label={t('ownerName')}
          description={t('ownerNameDescription')}
          htmlFor="setting-owner-name"
          control={
            <Input
              id="setting-owner-name"
              value={settings.ownerName}
              onChange={(e) => onSettingsChange({ ...settings, ownerName: e.target.value })}
              placeholder={t('ownerNamePlaceholder')}
              autoComplete="name"
              aria-label={t('ownerName')}
            />
          }
        />
        <SettingsRow
          label={t('uiLanguage')}
          description={t('uiLanguageDescription')}
          control={
            <Select
              options={[{ value: 'en', label: t('uiEnglish') }, { value: 'nl', label: t('uiDutch') }]}
              value={language}
              onChange={(nextLanguage) => {
                onSettingsChange({ ...settings, language: nextLanguage });
                setLanguage?.(nextLanguage as Language);
              }}
              aria-label={t('uiLanguage')}
            />
          }
        />
      </SettingsGroup>
      <AudioCaptureSection settings={settings} onSettingsChange={onSettingsChange} />
      <SettingsGroup>
      <SettingsRow
        label={t('followTranscript')}
        description={t('followTranscriptDescription')}
        htmlFor="setting-auto-scroll"
        control={
          <Switch
            id="setting-auto-scroll"
            checked={settings.autoScroll}
            onCheckedChange={(autoScroll) => onSettingsChange({ ...settings, autoScroll })}
            aria-label={t('followTranscript')}
          />
        }
      />
    </SettingsGroup>
      <AppearanceSection />
    </>
  );
}
