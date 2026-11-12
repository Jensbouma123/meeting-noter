'use client';

import { RadioGroup, Radio } from '@jensbouma123/acciva-ui';
import { useThemePreference, type ThemePreference } from '@/components/meeting/ThemeSwitcher';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup, SettingsStackedRow } from './SettingsRow';

export function AppearanceSection() {
  const t = useT('settings');
  const { preference, choose } = useThemePreference();
  const isSmUp = useMediaQuery('(min-width: 640px)');

  return (
    <SettingsGroup>
      <SettingsStackedRow label={t('theme')} description={t('themeDescription')}>
        <RadioGroup
          value={preference}
          onChange={(v) => choose(v as ThemePreference)}
          orientation={isSmUp ? 'horizontal' : 'vertical'}
        >
          <Radio
            value="system"
            variant="card"
            label={t('system')}
            description={t('systemThemeDescription')}
          />
          <Radio value="light" variant="card" label={t('light')} />
          <Radio value="dark" variant="card" label={t('dark')} />
        </RadioGroup>
      </SettingsStackedRow>
    </SettingsGroup>
  );
}
