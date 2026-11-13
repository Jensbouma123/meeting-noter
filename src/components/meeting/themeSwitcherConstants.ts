import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from './ThemeSwitcher.types';

export const THEME_PREFERENCE_KEY = 'mn-theme-preference';

export const THEME_PREFERENCE_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_LABEL_KEYS: Record<ThemePreference, string> = {
  system: 'system',
  light: 'light',
  dark: 'dark',
};

export const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
