import { useEffect } from 'react';
import type { SettingsSectionProps } from './types';

export function useSettleLegacyNativeCapture({ settings, onSettingsChange }: SettingsSectionProps) {
  useEffect(() => {
    if (settings.systemVia === 'native') {
      onSettingsChange({ ...settings, systemVia: 'browser' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.systemVia]);
}
