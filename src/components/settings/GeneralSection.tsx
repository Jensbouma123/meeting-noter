'use client';

import { Switch } from '@jensbouma123/acciva-ui';
import type { AppSettings } from '@/components/meeting/types';
import { SettingsGroup, SettingsRow } from './SettingsRow';

export function GeneralSection({
  settings,
  onSettingsChange,
}: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  return (
    <SettingsGroup>
      <SettingsRow
        label="Follow live transcript"
        description="Keep the newest words in view while you're scrolled to the bottom."
        htmlFor="setting-auto-scroll"
        control={
          <Switch
            id="setting-auto-scroll"
            checked={settings.autoScroll}
            onCheckedChange={(autoScroll) => onSettingsChange({ ...settings, autoScroll })}
            aria-label="Follow live transcript"
          />
        }
      />
    </SettingsGroup>
  );
}
