'use client';

import { RadioGroup, Radio } from '@jensbouma123/acciva-ui';
import { useThemePreference } from '@/components/meeting/useThemePreference';
import type { ThemePreference } from '@/components/meeting/ThemeSwitcher.types';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup } from './SettingsGroup';
import { SettingsStackedRow } from './SettingsStackedRow';

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
