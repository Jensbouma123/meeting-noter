'use client';

import { useTheme } from '@jensbouma123/acciva-ui/theme';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@jensbouma123/acciva-ui';
import { useCallback, useEffect, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';

const PREFERENCE_KEY = 'mn-theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';

const CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};
const LABELS = THEME_PREFERENCE_LABELS;

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(PREFERENCE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage unavailable — fall through to the default.
  }
  return 'system';
}

/**
 * Shared theme-preference state — backs both the TopBar `ThemeSwitcher` and
 * the Settings "Appearance" section, so the two controls never drift out of
 * sync (one localStorage key, one `useTheme().setMode` call site per change).
 */
export function useThemePreference() {
  const { setMode } = useTheme();

  // Hydration safety: the server has no localStorage and no media query, so the
  // first client render MUST match the server's. `null` renders the neutral
  // trigger; the real preference is adopted in the mount effect below.
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot localStorage hydration */
    setPreference(readPreference());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // While `system` is active the OS can flip under us, so follow the media
  // query; otherwise the explicit choice pins the mode.
  useEffect(() => {
    if (preference !== 'system') {
      if (preference) setMode(preference);
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
      setPreference(next);
      try {
        localStorage.setItem(PREFERENCE_KEY, next);
      } catch {
        // localStorage unavailable — in-memory only.
      }
      // Apply immediately so the menu feels instant; the effect above then
      // takes over the `system` media-query subscription.
      setMode(next === 'system' ? getSystemTheme() : next);
    },
    [setMode]
  );

  return { preference: preference ?? 'system', choose } as const;
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const { preference: current, choose } = useThemePreference();
  const ActiveIcon = ICONS[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip="Theme"
          aria-label={`Theme: ${LABELS[current]}`}
          leadingIcon={<ActiveIcon className="size-4" />}
          className={`touch-target-44 ${className ?? ''}`.trim()}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {CYCLE.map((pref) => {
          const selected = pref === current;
          return (
            <DropdownMenuItem
              key={pref}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => choose(pref)}
              className={selected ? 'font-semibold' : undefined}
            >
              {LABELS[pref]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
