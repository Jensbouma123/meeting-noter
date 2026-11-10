'use client';

import { useEffect, useState } from 'react';
import { RadioGroup, Radio } from '@jensbouma123/acciva-ui';
import { useThemePreference, type ThemePreference } from '@/components/meeting/ThemeSwitcher';
import { SettingsGroup, SettingsStackedRow } from './SettingsRow';

export function AppearanceSection() {
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
      <SettingsStackedRow label="Theme" description="Use your device setting, or always light or dark.">
        <RadioGroup
          value={preference}
          onChange={(v) => choose(v as ThemePreference)}
          orientation={isSmUp ? 'horizontal' : 'vertical'}
        >
          <Radio
            value="system"
            variant="card"
            label="System"
            description="Matches your device's light or dark mode"
          />
          <Radio value="light" variant="card" label="Light" />
          <Radio value="dark" variant="card" label="Dark" />
        </RadioGroup>
      </SettingsStackedRow>
    </SettingsGroup>
  );
}
