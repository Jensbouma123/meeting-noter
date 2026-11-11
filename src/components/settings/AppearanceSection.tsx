'use client';

import { useEffect, useState } from 'react';
import { RadioGroup, Radio } from '@jensbouma123/acciva-ui';
import { useThemePreference, type ThemePreference } from '@/components/meeting/ThemeSwitcher';
import { useT } from '@/lib/i18n/useT';
import { SettingsGroup, SettingsStackedRow } from './SettingsRow';

export function AppearanceSection() {
  const t = useT('settings');
  const { preference, choose } = useThemePreference();
  const [isSmUp, setIsSmUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => setIsSmUp(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
