import { useCallback, useState } from 'react';
import type { SettingsSectionId } from '@/components/settings/types';

export function useSettingsDialog() {
  const [settingsOpen, setOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId | undefined>();
  const openSettings = useCallback((section?: SettingsSectionId) => {
    setSettingsSection(section);
    setOpen(true);
  }, []);
  const setSettingsOpen = useCallback((open: boolean) => {
    if (!open) setSettingsSection(undefined);
    setOpen(open);
  }, []);
  return { settingsOpen, setSettingsOpen, settingsSection, openSettings };
}
