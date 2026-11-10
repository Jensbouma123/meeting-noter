'use client';

import { Select } from '@jensbouma123/acciva-ui';
import type { AppSettings } from '@/components/meeting/types';
import { SettingsGroup, SettingsRow } from './SettingsRow';

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Dutch (Nederlands)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'it', label: 'Italian (Italiano)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'ja', label: 'Japanese (日本語)' },
];

export function TranscriptionSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  return (
    <SettingsGroup>
      <SettingsRow
        label="Spoken language"
        description="The language people speak in your meetings. Auto-detect picks it up in the first few seconds."
        control={
          <Select
            options={LANGUAGE_OPTIONS}
            value={settings.language}
            onChange={(language) => onSettingsChange({ ...settings, language })}
            aria-label="Spoken language"
          />
        }
      />
    </SettingsGroup>
  );
}
