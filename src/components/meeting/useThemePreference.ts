import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from '@jensbouma123/acciva-ui/theme';
import {
  getPreferenceSnapshot,
  getServerPreferenceSnapshot,
  getSystemTheme,
  storePreference,
  subscribePreference,
} from './themePreferenceStore';
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
    if (preference !== 'system') {
      setMode(preference);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setMode(mq.matches ? 'dark' : 'light');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference, setMode]);

  const choose = useCallback(
    (next: ThemePreference) => {
      storePreference(next);
      setMode(next === 'system' ? getSystemTheme() : next);
    },
    [setMode]
  );

  return { preference: preference ?? 'system', choose } as const;
}
