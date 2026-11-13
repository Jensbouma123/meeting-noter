import { useCallback, useState } from 'react';
import type { SettingsSectionId } from '@/components/settings/types';

export function useSettingsDialog() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | undefined>();
  const openSettings = useCallback((section?: SettingsSectionId) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);
  return { settingsOpen, setSettingsOpen, settingsSection, openSettings };
}
