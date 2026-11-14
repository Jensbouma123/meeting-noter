import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from '@jensbouma123/acciva-ui/theme';
import { getPreferenceSnapshot, getServerPreferenceSnapshot, storePreference, subscribePreference } from './themePreferenceStore';
import type { ThemePreference } from './ThemeSwitcher.types';

export function useThemePreference() {
  const { setMode } = useTheme();

  const preference = useSyncExternalStore<ThemePreference | null>(
    subscribePreference,
    getPreferenceSnapshot,
    getServerPreferenceSnapshot
  );

  useEffect(() => {
    if (preference === null) return;
    setMode(preference);
  }, [preference, setMode]);

  const choose = useCallback(
    (next: ThemePreference) => {
      storePreference(next);
      setMode(next);
    },
    [setMode]
  );

  return { preference: preference ?? 'system', choose } as const;
}
