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
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

const PREFERENCE_KEY = 'mn-theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';

const CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

/** Settings-namespace key per preference; the label itself is translated at render. */
const LABEL_KEYS: Record<ThemePreference, string> = {
  system: 'system',
  light: 'light',
  dark: 'dark',
};

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
/** Listeners of the preference store, notified by `choose`. */
const listeners = new Set<() => void>();
/** Holds the choice only when localStorage is unavailable. */
let memoryPreference: ThemePreference | null = null;

function subscribePreference(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  return memoryPreference ?? readPreference();
}

// Hydration safety: the server has no localStorage and no media query, so the
// first client render MUST match the server's. `null` renders the neutral trigger
// until the client snapshot takes over.
function getServerPreferenceSnapshot(): ThemePreference | null {
  return null;
}

export function useThemePreference() {
  const { setMode } = useTheme();

  const preference = useSyncExternalStore<ThemePreference | null>(
    subscribePreference,
    getPreferenceSnapshot,
    getServerPreferenceSnapshot
  );

  // While `system` is active the OS can flip under us, so follow the media
  // query; otherwise the explicit choice pins the mode.
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
      try {
        localStorage.setItem(PREFERENCE_KEY, next);
        memoryPreference = null;
      } catch {
        // localStorage unavailable — in-memory only.
        memoryPreference = next;
      }
      listeners.forEach((notify) => notify());
      // Apply immediately so the menu feels instant; the effect above then
      // takes over the `system` media-query subscription.
      setMode(next === 'system' ? getSystemTheme() : next);
    },
    [setMode]
  );

  return { preference: preference ?? 'system', choose } as const;
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const t = useT('settings');
  const { preference: current, choose } = useThemePreference();
  const ActiveIcon = ICONS[current];
  const label = (preference: ThemePreference) => t(LABEL_KEYS[preference]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('theme')}
          aria-label={`${t('theme')}: ${label(current)}`}
          leadingIcon={<ActiveIcon className="size-4" />}
          className={`touch-target-44 ${className ?? ''}`.trim()}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
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
              {label(pref)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
